# api/chat/consumers.py
import base64
import json
import os

from django.conf import settings
from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
from channels.db import database_sync_to_async
from django.core.files.base import ContentFile
from django.db.models import Q, Exists, OuterRef
from django.db.models.functions import Coalesce

from .models import User, Connection, Message
from .serializers import (
    UserSerializer, 
    SearchSerializer, 
    RequestSerializer, 
    FriendSerializer,
    MessageSerializer
)
from .utils import (
    generate_waveform, 
    extract_video_duration_ms, 
    generate_video_thumbnail
)

from jwt.exceptions import ExpiredSignatureError

class ChatConsumers(WebsocketConsumer):
    
    def connect(self):
        try:
            user = self.scope['user']
            print("WebSocket connect attempt:", user, user.is_authenticated)

            if not user.is_authenticated:
                print("WebSocket rejected: unauthenticated")
                self.close(code=4003)  # custom code for unauthenticated
                return

            print("WebSocket accepted for:", user.username)
            self.username = user.username

            async_to_sync(self.channel_layer.group_add)(
                self.username, self.channel_name
            )
            self.accept()

        except ExpiredSignatureError:
            print("WebSocket rejected: expired token")
            self.close(code=4001)  # custom code for expired JWT
        
        
    def disconnect(self, close_code):
        # Leave room/group
        username = getattr(self, "username", None)
        
        if username:
            async_to_sync(self.channel_layer.group_discard)(
                username, self.channel_name
            )
        print("Disconnected:", username, self.channel_name)


    #--------------------------
    #     Handle Requests
    #--------------------------
    def receive(self, text_data):
        # Receive message from Websocket
        data = json.loads(text_data)
        # data_source = data.get('source')
        data_type = data.get('type')
        
        # Pretty print python dictionary
        print('receive', json.dumps(data, indent=2))
        
        # Get friend list
        if data_type == 'friend.list':
            self.receive_friend_list(data)
        
        # Message List
        elif data_type == 'message.list':
            self.receive_message_list(data)
        
        # Message has been sent
        elif data_type == 'message.send':
            self.receive_message_send(data)
        
        # User is typing a message
        elif data_type == 'message.type':
            self.receive_message_type(data)
        
        # Accept friend request
        elif data_type == 'request.accept':
            self.receive_request_accept(data)
        
        # Make friend request
        elif data_type == 'request.connect':
            self.receive_request_connect(data)
            
        # Get request list
        elif data_type == 'request.list':
            self.receive_request_list(data)
        
        # Search / Filter Users
        elif data_type == 'search':
            self.receive_search(data)
        
        # Thumbnail Upload
        elif data_type == 'thumbnail':
            self.receive_thumbnail(data)
        
        # Message Seen  
        elif data_type == 'message.seen':
            self.receive_message_seen(data)
        
        # Message Delete
        elif data_type == 'message.delete':
            self.receive_message_delete(data)

        # Message Forward
        elif data_type == 'message.forward':
            self.receive_message_forward(data)
    
    
    def receive_friend_list(self, data):
        user = self.scope['user']
        # Latest message subquery
        latest_message = Message.objects.filter(
            connection=OuterRef('id')
        ).order_by('-created')[:1]
        # Get connections for the user
        connections = Connection.objects.filter(
            Q(sender=user) | Q(receiver=user),
            accepted=True
        ).annotate(
            latest_text=latest_message.values('text'),
            latest_created=latest_message.values('created')
        ).order_by(
            Coalesce('latest_created', 'updated').desc()
        )
        serialized = FriendSerializer(
            connections, 
            context={
                'user': user
            }, 
            many=True
        )
        # Send data back to requesting user
        self.send_group(user.username, 'friend.list', serialized.data)
    
    
    def receive_message_list(self, data): 
        print("[Debug] Raw incoming data to receive_message_list:", data)
        
        user = self.scope['user']
        connectionId = data.get('connectionId')
        page = data.get('page')
        page_size = 15
        
        print("receive_message_list called with", connectionId, page)
        
        if connectionId is None:
            print("Error: Missing connectionId in payload:", data)
            return

        try:
            connection = Connection.objects.get(id=connectionId)
        except Connection.DoesNotExist:
            print(f"Error: Connection {connectionId} not found")
            return
        
        # Get messages
        messages = Message.objects.filter(
            connection=connection
        ).order_by('-created')[page * page_size:(page + 1) * page_size]
        
        # Serialized Message
        serialized_messages = MessageSerializer(
            messages,
            context={
                'user': user
            },
            many=True
        )
        
        # Get recipient friend
        recipient = connection.sender
        if connection.sender == user:
            recipient = connection.receiver
        
        # Serialize friend
        serialized_friend = UserSerializer(recipient)
        
        # Count the total number of messages for this connection
        messages_count = Message.objects.filter(
            connection=connection
        ).count()  
        
        # If there are still more messages beyond this slice, return the next page index
        # if (page + 1) * page_size < messages_count:
        #     next_page = page + 1
        # else:
        #     next_page = None

        # Calculate next page index if there are more messages
        next_page = page + 1 if (page + 1) * page_size < messages_count else None
        
        data = {
            'messages': serialized_messages.data,
            'next': next_page,
            'friend': serialized_friend.data,
            'connection_id': connection.id   # ✅ add this
        }
        
        print("[Debug] Sending message.list for connId:", connection.id,
          "messages:", len(serialized_messages.data),
          "friend:", serialized_friend.data.get("username"))
        
        # Debug: Print the last message for this connection
        last_msg = Message.objects.filter(connection=connection).order_by('-created').first()
        if last_msg:
            print("[DB Debug] Last message for connId", connection.id,
                "friend:", recipient.username,
                "text:", last_msg.text)
        else:
            print("[DB Debug] No messages found for connId", connection.id)

        # Send back to the requestor
        self.send_group(user.username, 'message.list', data)
    

    # New receive_message_send with media support
    def receive_message_send(self, data):
        user = self.scope['user']
        # ✅ Use correct key name
        connection_id = data.get('connection_id') or data.get('connectionId')
        
        # ✅ Extract text from nested message object
        message_obj = data.get('message') or {}
        message_text = message_obj.get('text')
    
        image = data.get('image')
        image_filename = data.get('image_filename')
        voice = data.get('voice')
        voice_filename = data.get('voice_filename')
        video = data.get('video')
        video_filename = data.get('video_filename')

        try:
            connection = Connection.objects.get(id=connection_id)
        except Connection.DoesNotExist:
            print(f"[InboundShare] Error: Connection {connection_id} not found")
            return
        
        # ✅ Debug log
        print(f"[InboundShare] Creating message for connId={connection_id}, text={message_text}")

        message = Message.objects.create(
            connection=connection,
            user=user,
            text=message_text,
            delivered=True
        )       

        # New image code
        if image and image_filename:
            if ';base64,' in image:
                _, imgstr = image.split(';base64,')
            else:
                imgstr = image  # ✅ assume raw base64 if no prefix
            print(f"[receive_message_send] Saving image {image_filename}, length={len(imgstr)}")
            message.image.save(image_filename, ContentFile(base64.b64decode(imgstr)), save=True)

        # Voice
        if voice and voice_filename:
            format, voicestr = voice.split(';base64,') if ';base64,' in voice else ('', voice)
            message.voice.save(voice_filename, ContentFile(base64.b64decode(voicestr)), save=True)
            generate_waveform(message)
            
        
        # Video
        if video and video_filename:
            videostr = video.split(';base64,')[-1] if ';base64,' in video else video
            message.video.save(video_filename, ContentFile(base64.b64decode(videostr)), save=True)

            try:
                abs_path = message.video.path
                print("[receive_message_send] Video path:", abs_path)

                # Duration
                duration_ms = extract_video_duration_ms(abs_path)
                print("[receive_message_send] Duration ms:", duration_ms)
                if duration_ms is not None:
                    message.video_duration = round(duration_ms / 1000)
                else:
                    print("[receive_message_send] No duration extracted")

                # Thumbnail
                temp_dir = os.path.join(settings.MEDIA_ROOT, "tmp_thumbs")
                os.makedirs(temp_dir, exist_ok=True)

                thumb_name, thumb_path = generate_video_thumbnail(abs_path, temp_dir)
                print("[receive_message_send] Thumbnail result:", thumb_name, thumb_path)
                if thumb_name and thumb_path and os.path.exists(thumb_path):
                    with open(thumb_path, "rb") as fh:
                        message.video_thumbnail.save(
                            thumb_name,
                            ContentFile(fh.read(), name=thumb_name),
                            save=False
                        )
                    print("[receive_message_send] Thumb saved:", thumb_name)
                else:
                    print("[receive_message_send] Thumbnail not created")

                # Persist updated fields in one shot
                message.save(update_fields=["video_duration", "video_thumbnail"])
                print("[receive_message_send] Final saved:", message.id, message.video_duration, message.video_thumbnail)

            except Exception as e:
                print("[receive_message_send] Video metadata error:", e)
            
              
        # Determine recipient
        recipient = connection.sender if connection.sender != user else connection.receiver

        # Send to sender
        serialized_message = MessageSerializer(message, context={'user': user})
        serialized_friend = UserSerializer(recipient)
        self.send_group(user.username, 'message.send', {
            'message': serialized_message.data,
            'friend': serialized_friend.data,
            'connection_id': connection.id
        })

        # Send to recipient
        serialized_message = MessageSerializer(message, context={'user': recipient})
        serialized_friend = UserSerializer(user)
        self.send_group(recipient.username, 'message.send', {
            'message': serialized_message.data,
            'friend': serialized_friend.data,
            'connection_id': connection.id
    })
        
    
    def receive_message_type(self, data):
        user = self.scope['user']
        recipient_username = data.get('username')
        
        data = {
            'username': user.username
        }
        self.send_group(recipient_username, 'message.type', data)
    
    
    def receive_request_accept(self, data):
        username = data.get('username')
        # Fetch connection object
        try:
            connection = Connection.objects.get(
                sender__username=username,
                receiver=self.scope['user']
            )
        except Connection.DoesNotExist:
            print('Error: Connection doesn\'t exists!')
            return
        # Update the connection
        connection.accepted = True
        connection.save()
        
        serialized = RequestSerializer(connection)
        # Send accepted request to sender
        self.send_group(
            connection.sender.username, 'request.accept', serialized.data
        )
        # Send accepted request to receiver
        self.send_group(
            connection.receiver.username, 'request.accept', serialized.data
        )
        # Notify both users to update their friend lists
        # Send new friend object to sender
        serialized_friend = FriendSerializer(
            connection,
            context={
                'user': connection.sender
            }
        )
        self.send_group(
            connection.sender.username, 'friend.new', serialized_friend.data
        )
        
        # Send new friend object to receiver
        serialized_friend = FriendSerializer(
            connection,
            context={
                'user': connection.receiver
            }
        )
        self.send_group(
            connection.receiver.username, 'friend.new', serialized_friend.data
        )
    
    def receive_request_connect(self, data):
        username = data.get('username')
        # Attempt to fetch the receiving user
        try:
            receiver = User.objects.get(username=username)
        except User.DoesNotExist:
            print('Error: User not found!')
            return
        # Create Connection
        connection, _ = Connection.objects.get_or_create(
            sender=self.scope['user'],
            receiver=receiver
        )
        # Serialized Connection
        serialized = RequestSerializer(connection)
        # Send Bact to Sender
        self.send_group(
            connection.sender.username, 'request.connect', serialized.data
        )
        # Send to Receiver
        self.send_group(
            connection.receiver.username, 'request.connect', serialized.data
        )
        
    def receive_request_list(self, data):
        user = self.scope['user']
        # Get connection made to this user
        connections = Connection.objects.filter(
            receiver=user,
            accepted=False
        )
        serialized = RequestSerializer(connections, many=True)
        # Send requests list back to this user
        self.send_group(user.username, 'request.list', serialized.data)
        
            
    def receive_search(self, data):
        query = data.get('query')
        # Get users from query search term
        users = User.objects.filter(
            Q(username__istartswith=query) | 
            Q(first_name__istartswith=query) | 
            Q(last_name__istartswith=query)             
        ).exclude(
            username=self.username
        ).annotate(
            pending_them=Exists(
                Connection.objects.filter(
                    sender=self.scope['user'],
                    receiver=OuterRef('id'),
                    accepted=False
                )
            ),
            pending_me=Exists(
                Connection.objects.filter(
                    sender=OuterRef('id'),
                    receiver=self.scope['user'],
                    accepted=False
                )
            ),
            connected=Exists(
                Connection.objects.filter(
                    Q(sender=self.scope['user'], receiver=OuterRef('id')) | 
                    Q(receiver=self.scope['user'], sender=OuterRef('id')), 
                    accepted=True
                )
            )
        )
        # serialize results
        serialized = SearchSerializer(users, many=True)
        
        # Send search results back to this user
        self.send_group(self.username, 'search', serialized.data)
            
            
    def receive_thumbnail(self, data):
        user = self.scope['user']
        
        # Convert base64 data to django content file
        image_str = data.get('base64')
        image = ContentFile(base64.b64decode(image_str))
        
        # Update thumbnail field
        filename = data.get('filename')
        user.thumbnail.save(filename, image, save=True)
        
        # Serialize user
        serialized = UserSerializer(user)
        
        # Send updated user data including new thumbnail
        self.send_group(self.username, 'thumbnail', serialized.data)
      
    # New Message Seen handler:  
    def receive_message_seen(self, data):
        user = self.scope['user']
        message_id = data.get('messageId')
        try:
            msg = Message.objects.get(id=message_id)
        except Message.DoesNotExist:
            return

        # Only recipient can mark seen
        if msg.user != user:
            msg.seen = True
            msg.save()

            serialized = MessageSerializer(msg, context={'user': user})
            self.send_group(msg.connection.sender.username, 'message.seen', serialized.data)
            self.send_group(msg.connection.receiver.username, 'message.seen', serialized.data)
    
    # --------------------------
    #     Message Delete (client -> server)
    # --------------------------
    def receive_message_delete(self, data):
        user = self.scope['user']
        connection_id = data.get("connectionId")
        message_id = data.get("messageId")

        try:
            msg = Message.objects.get(id=message_id, connection_id=connection_id)
        except Message.DoesNotExist:
            return

        # Only allow sender to delete
        if msg.user != user:
            return

        msg.delete()

        # Broadcast deletion back to both participants via usernames
        # Determine participants via connection
        try:
            connection = Connection.objects.get(id=connection_id)
        except Connection.DoesNotExist:
            return

        # Notify both users to remove message
        self.send_group(connection.sender.username, "message.deleted", {"messageId": message_id})
        self.send_group(connection.receiver.username, "message.deleted", {"messageId": message_id})


    # --------------------------
    #     Message Forward (client -> server)
    # --------------------------
    def receive_message_forward(self, data):
        user = self.scope['user']
        from_conn = data.get("fromConnectionId")
        to_conn = data.get("toConnectionId")
        ids = data.get("messageIds", [])

        # Validate target connection
        try:
            target_connection = Connection.objects.get(id=to_conn)
        except Connection.DoesNotExist:
            return

        for mid in ids:
            try:
                msg = Message.objects.get(id=mid, connection_id=from_conn)
            except Message.DoesNotExist:
                continue

            # Duplicate into new connection (set sender = current user)
            new_msg = Message.objects.create(
                connection=target_connection,
                user=user,
                text=msg.text,
                image=msg.image,
                voice=msg.voice,
                video=msg.video,
                video_thumbnail=msg.video_thumbnail,
                # video_duration_ms=msg.video_duration_ms,
                video_duration=msg.video_duration,
                delivered=True,
            )

            # Broadcast to both participants of target connection using DRF serializer
            sender_ctx = {'user': target_connection.sender}
            receiver_ctx = {'user': target_connection.receiver}

            self.send_group(
                target_connection.sender.username,
                "message.send",
                {
                    "message": MessageSerializer(new_msg, context=sender_ctx).data,
                    "friend": UserSerializer(target_connection.receiver).data,
                    "connection_id": target_connection.id,
                },
            )

            self.send_group(
                target_connection.receiver.username,
                "message.send",
                {
                    "message": MessageSerializer(new_msg, context=receiver_ctx).data,
                    "friend": UserSerializer(target_connection.sender).data,
                    "connection_id": target_connection.id,
                },
            )
    
    # --------------------------
    # Explicit handlers for Channels dispatch
    # --------------------------
    def request_list(self, event):
        self.receive_request_list(event)

    def friend_list(self, event):
        self.receive_friend_list(event)

    def message_list(self, event):
        self.receive_message_list(event)

    def message_send(self, event):
        self.receive_message_send(event)

    def message_type(self, event):
        self.receive_message_type(event)

    def request_accept(self, event):
        self.receive_request_accept(event)

    def request_connect(self, event):
        self.receive_request_connect(event)

    def search(self, event):
        self.receive_search(event)

    def thumbnail(self, event):
        self.receive_thumbnail(event)

    def message_seen(self, event):
        self.receive_message_seen(event)

    def message_delete(self, event):
        self.receive_message_delete(event)

    def message_forward(self, event):
        self.receive_message_forward(event)

        
    #-------------------------------------------------
    #     Catch/All Broadcast to Client Helpers
    #-------------------------------------------------
    # def send_group(self, group, event_type, data):
    #     response = {
    #         # 'type': 'broadcast_group',
    #         'type': event_type,
    #         'data': data
    #     }
    #     async_to_sync(self.channel_layer.group_send)(
    #         group, response
    #     )
        
    def send_group(self, group, event_type, data):
        print(f"[Debug] send_group called for group={group}, event_type={event_type}")
        async_to_sync(self.channel_layer.group_send)(
            group,
            {
                "type": "chat_message",   # ✅ always dispatch to chat_message
                "event": event_type,
                "data": data,
            }
        )

    def chat_message(self, event):
        print("[Debug] chat_message invoked:", event)
        self.send(text_data=json.dumps({
            "type": event["event"],
            "data": event["data"]
        }))
        
        
    # def broadcast_group(self, data):
    #     '''
    #     data:
    #         - type: actual event type (e.g. 'friend.list', 'message.list')
    #         - data: payload dictionary
    #     '''
        
    #     # data.pop('type')
    #     # '''
    #     # return data:
    #     #     - source: Where it originated from?
    #     #     - data: What ever you want to send as a dictionary
    #     # '''
        
    #     self.send(text_data=json.dumps(data))
        


 # if video and video_filename:
        #     if ';base64,' in video:
        #         _, videostr = video.split(';base64,')
        #     else:
        #         videostr = video
        #     message.video.save(video_filename, ContentFile(base64.b64decode(videostr)), save=True)

        #     # Extract metadata
        #     try:
        #         abs_path = message.video.path

        #         # ✅ Duration in integer seconds
        #         duration_ms = extract_video_duration_ms(abs_path)
        #         print("[receive_message_send] Duration ms:", duration_ms)
        #         if duration_ms:
        #             message.video_duration = round(duration_ms / 1000)

        #         # ✅ Generate thumbnail into MEDIA_ROOT/tmp_thumbs
        #         temp_dir = os.path.join(settings.MEDIA_ROOT, "tmp_thumbs")
        #         os.makedirs(temp_dir, exist_ok=True)

        #         thumb_name, thumb_path = generate_video_thumbnail(abs_path, temp_dir)
        #         print("[receive_message_send] Thumbnail result:", thumb_name, thumb_path)
        #         if thumb_name and os.path.exists(thumb_path):
        #             with open(thumb_path, "rb") as fh:
        #                 message.video_thumbnail.save(
        #                     thumb_name,
        #                     ContentFile(fh.read(), name=thumb_name),
        #                     save=True
        #                 )
        #     except Exception as e:
        #         print("[receive_message_send] Video metadata error:", e)

        #     # ✅ Always persist updated fields, even if metadata fails
        #     message.save()
        #     print("[receive_message_send] Final saved:", message.id, message.video_duration, message.video_thumbnail)

           
            
            # try:
            #     abs_path = message.video.path

            #     # ✅ Duration in integer seconds
            #     duration_ms = extract_video_duration_ms(abs_path)
            #     if duration_ms:
            #         message.video_duration = round(duration_ms / 1000)  # integer seconds

            #     # ✅ Generate thumbnail into MEDIA_ROOT/tmp_thumbs
            #     temp_dir = os.path.join(settings.MEDIA_ROOT, "tmp_thumbs")
            #     os.makedirs(temp_dir, exist_ok=True)

            #     thumb_name, thumb_path = generate_video_thumbnail(abs_path, temp_dir)
            #     if thumb_name and os.path.exists(thumb_path):
            #         with open(thumb_path, "rb") as fh:
            #             message.video_thumbnail.save(
            #                 thumb_name,
            #                 ContentFile(fh.read(), name=thumb_name),
            #                 save=True
            #             )
            #     message.save()
            # except Exception as e:
            #     print("[receive_message_send] Video metadata error:", e)
                 


# Old Video code
        # if video and video_filename:
        #     if ';base64,' in video:
        #         _, videostr = video.split(';base64,')
        #     else:
        #         videostr = video
        #     message.video.save(video_filename, ContentFile(base64.b64decode(videostr)), save=True)

        #     # Optional metadata
        #     try:
        #         abs_path = message.video.path
        #         message.video_duration_ms = extract_video_duration_ms(abs_path)
                
        #         # ✅ Generate thumbnail into a temporary directory
        #         temp_dir = os.path.join(settings.MEDIA_ROOT, "tmp_thumbs")
        #         os.makedirs(temp_dir, exist_ok=True)

        #         thumb_name, thumb_path = generate_video_thumbnail(abs_path, temp_dir)
        #         if thumb_name and os.path.exists(thumb_path):
        #             with open(thumb_path, "rb") as fh:
        #                 # ✅ Final storage path will be resolved by upload_message_media
        #                 message.video_thumbnail.save(thumb_name, ContentFile(fh.read(), name=thumb_name), save=True)
        #     except Exception as e:
        #         print("[receive_message_send] Video metadata error:", e)
