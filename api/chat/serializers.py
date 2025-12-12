# api/chat/serializers.py
from rest_framework import serializers
from rest_framework.reverse import reverse
from django.conf import settings

from .models import User, Connection, Message

class SignUpSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'username',
            'first_name',
            'last_name',
            'password'
        ]
        extra_kwargs = {
            'password': {
                # Ensures that when serializing, this field will be excluded.
                'write_only': True
            }
        }
    
    def create(self, validated_data):
        # Clean all values, set as lowercase
        username = validated_data['username'].lower()
        first_name = validated_data['first_name'].lower()
        last_name = validated_data['last_name'].lower()
        
        # Create new user
        user = User.objects.create(
            username=username,
            first_name=first_name,
            last_name=last_name
        )
        password = validated_data['password']
        user.set_password(password)
        user.save()
        
        return user


class UserSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'username',
            'name',            
            'thumbnail'
        ]
    
    def get_name(self, obj):
        fname = obj.first_name.capitalize()
        lname = obj.last_name.capitalize()
        
        return fname + ' ' + lname
    
    
class SearchSerializer(UserSerializer):
    status = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'username',
            'name',
            'thumbnail',
            'status'
        ]
        
    def get_status(self, obj):
        if obj.pending_them:
            return 'pending-them'
        elif obj.pending_me:
            return 'pending-me'
        elif obj.connected:
            return 'connected'
        return 'no-connection'
    

class RequestSerializer(serializers.ModelSerializer):
    sender = UserSerializer()
    receiver = UserSerializer()
    
    class Meta:
        model = Connection
        fields = [
            'id',
            'sender',
            'receiver',
            'created'
        ]


class FriendSerializer(serializers.ModelSerializer):
    friend = serializers.SerializerMethodField()
    preview = serializers.SerializerMethodField()
    updated = serializers.SerializerMethodField()
    
    class Meta:
        model = Connection
        fields = [
            'id',
            'friend',
            'preview',
            'updated'
        ]
        
    def get_friend(self, obj):
        # If Im the sender
        if self.context['user'] == obj.sender:
            return UserSerializer(obj.receiver).data
        # If Im the receiver
        elif self.context['user'] == obj.receiver:
            return UserSerializer(obj.sender).data
        else:
            print('Error: No user found in friendSerializer!')
            
    def get_preview(self, obj):
        if not hasattr (obj, 'latest_text') or obj.latest_text is None:        
            return 'New connection!'
        return obj.latest_text
    
    def get_updated(self, obj):
        if not hasattr (obj, 'latest_created'):
            date = obj.updated            
        else:
            date = obj.latest_created or obj.updated
        return date.isoformat()        


class MessageSerializer(serializers.ModelSerializer):
    is_me = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()
    voice = serializers.SerializerMethodField()
    waveform = serializers.JSONField(read_only=True)
    video_url = serializers.SerializerMethodField()
    video_thumb_url = serializers.SerializerMethodField()
    video_duration = serializers.SerializerMethodField()
    connection_id = serializers.IntegerField(source='connection.id', read_only=True)
    
    class Meta:
        model = Message
        fields = [
            'id',
            'connection_id',
            'is_me',
            'text', 
            'image', 
            'voice',
            'waveform', 
            'video_url', 
            'video_thumb_url', 
            'video_duration',
            'delivered',
            'seen',
            'created'
        ]
        
    def get_is_me(self, obj):
        user = self.context.get('user')
        return obj.user == user

    def get_image(self, obj):
        if obj.image:
            return f"{settings.SITE_URL}{obj.image.url}"
        return None

    def get_voice(self, obj):
        if obj.voice:
            return f"{settings.SITE_URL}{obj.voice.url}"
        return None
    
    def get_video_url(self, obj):
        if obj.video:
            return f"{settings.SITE_URL}{obj.video.url}"
        return None

    def get_video_thumb_url(self, obj):
        if obj.video_thumbnail:
            return f"{settings.SITE_URL}{obj.video_thumbnail.url}"
        return None
 
    def get_video_duration(self, obj):
        if obj.video_duration is None:
            return None
        return int(obj.video_duration)  # already stored as integer seconds

   
    def serialize_message(msg, user=None):
        """
        Quick helper to serialize a Message instance into a dict.
        Mirrors MessageSerializer but without needing DRF context.
        """
        return {
            "id": msg.id,
            "connection_id": msg.connection.id,
            "is_me": (user == msg.user) if user else False,
            "text": msg.text,
            "image": f"{settings.SITE_URL}{msg.image.url}" if msg.image else None,
            "voice": f"{settings.SITE_URL}{msg.voice.url}" if msg.voice else None,
            "waveform": msg.waveform,
            "video_url": f"{settings.SITE_URL}{msg.video.url}" if msg.video else None,
            "video_thumb_url": f"{settings.SITE_URL}{msg.video_thumbnail.url}" if msg.video_thumbnail else None,            
            "video_duration": int(msg.video_duration) if msg.video_duration else None,
            "delivered": msg.delivered,
            "seen": msg.seen,
            "created": msg.created.isoformat(),
        }




# def get_video_duration(self, obj):
    #     if obj.video_duration_ms is None:
    #         return None
    #     return round(obj.video_duration_ms / 1000, 2)
    
  # "video_duration": round(msg.video_duration_ms / 1000, 2) if msg.video_duration_ms else None,