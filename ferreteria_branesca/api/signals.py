# Este código va en: api/signals.py

from django.core.mail import EmailMultiAlternatives
from django.dispatch import receiver
from django.template.loader import render_to_string
from django.urls import reverse
from django_rest_passwordreset.signals import reset_password_token_created
from decouple import config

@receiver(reset_password_token_created)
def password_reset_token_created(sender, instance, reset_password_token, *args, **kwargs):
    """
    Se ejecuta automáticamente cuando se crea un token de recuperación.
    Envía un correo al usuario con el enlace.
    """
    
    # Construimos la URL del Frontend donde el usuario pondrá la nueva clave
    # (Asumimos que tu React corre en localhost:3000)
    # El token va como parámetro en la URL
    reset_url = f"http://localhost:3000/password-reset?token={reset_password_token.key}"

    # Asunto y Mensaje
    subject = "Restablecer Contraseña - Ferretería Branesca"
    
    # Mensaje en texto plano
    message = f"Hola, {reset_password_token.user.username}.\n\n" \
              f"Hemos recibido una solicitud para restablecer tu contraseña.\n" \
              f"Ve al siguiente enlace para cambiarla:\n\n" \
              f"{reset_url}\n\n" \
              f"Si no fuiste tú, ignora este mensaje."

    # Enviar el correo
    msg = EmailMultiAlternatives(
        subject,
        message,
        config('EMAIL_USER'), # Remitente (tu correo configurado en .env)
        [reset_password_token.user.email] # Destinatario
    )
    msg.send()