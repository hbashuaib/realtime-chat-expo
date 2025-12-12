# api/chat/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Message
from .utils import generate_waveform

@receiver(post_save, sender=Message)
def handle_voice_waveform(sender, instance, created, **kwargs):
    if created and instance.voice:
        print(f"Signal triggered for Message ID {instance.id}")
        generate_waveform(instance)