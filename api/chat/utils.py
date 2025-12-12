# api/chat/utils.py
import json
import subprocess
import base64, uuid, os, subprocess, tempfile

from pathlib import Path
from django.core.files.base import ContentFile
from django.conf import settings

FFMPEG_BIN = r"C:\ffmpeg\bin\ffmpeg.exe"
FFPROBE_BIN = r"C:\ffmpeg\bin\ffprobe.exe"

def to_wsl_path(path: Path) -> str:
    return "/mnt/" + path.drive.lower().replace(":", "") + path.as_posix()[2:]

def extract_waveform_json(json_path):
    with open(json_path, 'r') as f:
        raw = json.load(f)
    return [round(x / 255, 2) for x in raw['data']]

def generate_waveform(message):
    voice_path = Path(message.voice.path)
    wav_path = voice_path.with_suffix('.wav')
    json_path = voice_path.with_suffix('.json')

    wsl_voice = to_wsl_path(voice_path)
    wsl_wav = to_wsl_path(wav_path)
    wsl_json = to_wsl_path(json_path)

    print(f"Converting to WAV: {wsl_wav}")
    subprocess.run([
        "wsl", "ffmpeg",
        "-i", wsl_voice,
        "-ac", "1",
        "-ar", "44100",
        wsl_wav
    ])

    print(f"Running audiowaveform on {wsl_wav}")
    subprocess.run([
        "wsl", "~/audiowaveform/build/audiowaveform",
        "-i", wsl_wav,
        "-o", wsl_json,
        "--pixels-per-second", "10",
        "--bits", "8"
    ])

    if json_path.exists():
        print(f"Waveform JSON created: {json_path}")
        message.waveform = extract_waveform_json(json_path)
        message.save()
    else:
        print("Waveform JSON not found — audiowaveform may have failed.")
    

def save_base64_file(b64, filename, subdir):
    data = base64.b64decode(b64)
    name = f"{uuid.uuid4()}_{filename}"
    path = os.path.join(subdir, name)
    return name, ContentFile(data, name=filename), path


def extract_video_duration_ms(filepath):
    try:
        result = subprocess.run(
            [FFPROBE_BIN, "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", filepath],
            capture_output=True, text=True, check=True
        )
        dur_str = result.stdout.strip()
        print("[ffprobe stdout]", dur_str)
        print("[ffprobe stderr]", result.stderr)

        if not dur_str:
            print("[extract_video_duration_ms] No duration returned")
            return None

        dur = float(dur_str)
        return int(dur * 1000)
    except Exception as e:
        print("[extract_video_duration_ms error]", e)
        return None


def generate_video_thumbnail(filepath, out_dir):
    thumb_name = f"{uuid.uuid4()}_thumb.jpg"
    thumb_path = os.path.join(out_dir, thumb_name)
    try:
        result = subprocess.run(
            [FFMPEG_BIN, "-y", "-ss", "00:00:00.500", "-i", filepath,
             "-frames:v", "1", "-q:v", "3", thumb_path],
            capture_output=True, text=True, check=True
        )
        print("[ffmpeg stdout]", result.stdout)
        print("[ffmpeg stderr]", result.stderr)

        if not os.path.exists(thumb_path):
            print("[generate_video_thumbnail] Thumbnail not created")
            return None, None

        return thumb_name, thumb_path
    except Exception as e:
        print("[generate_video_thumbnail error]", e)
        return None, None


# def extract_video_duration_ms(filepath):
#     try:
#         result = subprocess.run(
#             [FFPROBE_BIN, "-v", "error", "-show_entries", "format=duration",
#              "-of", "default=noprint_wrappers=1:nokey=1", filepath],
#             capture_output=True, text=True, check=True
#         )
#         print("[ffprobe stdout]", result.stdout)
#         print("[ffprobe stderr]", result.stderr)
#         dur_str = result.stdout.strip()
#         dur = float(dur_str)
#         return int(dur * 1000)
#     except Exception as e:
#         print("[extract_video_duration_ms error]", e)
#         return None


# def extract_video_duration_ms(filepath):
#     try:
#         result = subprocess.run(
#             ["ffprobe", "-v", "error", "-show_entries", "format=duration",
#              "-of", "default=noprint_wrappers=1:nokey=1", filepath],
#             capture_output=True, text=True
#         )
#         print("[ffprobe stdout]", result.stdout)
#         print("[ffprobe stderr]", result.stderr)
#         dur = float(result.stdout.strip())
#         return int(dur * 1000)
#     except Exception as e:
#         print("[extract_video_duration_ms error]", e)
#         return None

# def generate_video_thumbnail(filepath, out_dir):
#     thumb_name = f"{uuid.uuid4()}_thumb.jpg"
#     thumb_path = os.path.join(out_dir, thumb_name)
#     try:
#         result = subprocess.run(
#             [FFMPEG_BIN, "-y", "-ss", "00:00:00.500", "-i", filepath,
#              "-frames:v", "1", "-q:v", "3", thumb_path],
#             capture_output=True, text=True, check=True
#         )
#         print("[ffmpeg stdout]", result.stdout)
#         print("[ffmpeg stderr]", result.stderr)
#         return thumb_name, thumb_path
#     except Exception as e:
#         print("[generate_video_thumbnail error]", e)
#         return None, None


# def generate_video_thumbnail(filepath, out_dir):
#     thumb_name = f"{uuid.uuid4()}_thumb.jpg"
#     thumb_path = os.path.join(out_dir, thumb_name)
#     try:
#         result = subprocess.run(
#             ["ffmpeg", "-y", "-ss", "00:00:00.500", "-i", filepath,
#              "-frames:v", "1", "-q:v", "3", thumb_path],
#             capture_output=True, text=True, check=True
#         )
#         print("[ffmpeg stdout]", result.stdout)
#         print("[ffmpeg stderr]", result.stderr)
#         return thumb_name, thumb_path
#     except Exception as e:
#         print("[generate_video_thumbnail error]", e)
#         return None, None


# def extract_video_duration_ms(filepath):
#     # uses ffprobe if available
#     try:
#         result = subprocess.run(
#             ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", filepath],
#             capture_output=True, text=True
#         )
#         dur = float(result.stdout.strip())
#         return int(dur * 1000)
#     except Exception:
#         return None


# def generate_video_thumbnail(filepath, out_dir):
#     # single frame at 0.5s
#     thumb_name = f"{uuid.uuid4()}_thumb.jpg"
#     thumb_path = os.path.join(out_dir, thumb_name)
#     try:
#         subprocess.run(
#             ["ffmpeg", "-y", "-ss", "00:00:00.500", "-i", filepath, "-frames:v", "1", "-q:v", "3", thumb_path],
#             check=True
#         )
#         return thumb_name, thumb_path
#     except Exception:
#         return None, None
