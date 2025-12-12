# api/chat/models.py

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models import JSONField

# Create your models here.
def upload_thumbnail(instance, filename):
    path = f'thumbnails/{instance.username}'
    extension = filename.split('.')[-1]
    if extension:
        path = path + '.' + extension
    return path

def upload_message_media(instance, filename):
    ext = filename.split('.')[-1]

    # Decide subfolder based on the field name
    field_name = None
    try:
        # Find which field is calling upload_to
        for f in instance._meta.fields:
            if getattr(instance, f.name) and filename == getattr(instance, f.name).name.split('/')[-1]:
                field_name = f.name
                break
    except Exception:
        pass

    if field_name == "video_thumbnail":
        return f'messages/{instance.connection.id}/thumbs/{instance.id}.{ext}'
    elif field_name == "video":
        return f'messages/{instance.connection.id}/videos/{instance.id}.{ext}'
    elif field_name == "voice":
        return f'messages/{instance.connection.id}/voices/{instance.id}.{ext}'
    elif field_name == "image":
        return f'messages/{instance.connection.id}/images/{instance.id}.{ext}'
    else:
        # Fallback: generic
        return f'messages/{instance.connection.id}/{instance.id}.{ext}'


class User(AbstractUser):
    thumbnail = models.ImageField(upload_to=upload_thumbnail, null=True, blank=True)
    

class Connection(models.Model):
    sender = models.ForeignKey(
        User, 
        related_name='sent_connections', 
        on_delete=models.CASCADE
    )
    receiver = models.ForeignKey(
        User, 
        related_name='received_connections', 
        on_delete=models.CASCADE
    )
    accepted = models.BooleanField(default=False)
    updated = models.DateTimeField(auto_now=True)
    created = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.sender.username + ' -> ' + self.receiver.username


class Message(models.Model):
    connection = models.ForeignKey(
        Connection,
        related_name='messages',
        on_delete=models.CASCADE
    )
    user =models.ForeignKey(
        User,
        related_name='my_messages',
        on_delete=models.CASCADE
    )
    text = models.TextField(blank=True, null=True)
    image = models.ImageField(upload_to=upload_message_media, blank=True, null=True)
    voice = models.FileField(upload_to=upload_message_media, blank=True, null=True)
    waveform = JSONField(blank=True, null=True)  # ← Use JSONField for SQLite
    video = models.FileField(upload_to=upload_message_media, null=True, blank=True)
    video_thumbnail = models.ImageField(upload_to=upload_message_media, null=True, blank=True)
    # video_duration_ms = models.PositiveIntegerField(null=True, blank=True)
    video_duration = models.PositiveIntegerField(null=True, blank=True)  # store integer seconds
    delivered = models.BooleanField(default=False)
    seen = models.BooleanField(default=False)
    created = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username}: {self.text or 'Media Message'}"

    def delete(self, *args, **kwargs):
        # Clean up associated files when a message is deleted
        if self.image:
            self.image.delete(save=False)
        if self.voice:
            self.voice.delete(save=False)
        if self.video:
            self.video.delete(save=False)
        if self.video_thumbnail:
            self.video_thumbnail.delete(save=False)
        super().delete(*args, **kwargs)

