import os
import random
import time
import cv2
import mediapipe as mp
import numpy as np
import pygame
import pymunk
from mediapipe import solutions
from mediapipe.framework.formats import landmark_pb2
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# Path helper function to route asset queries to the 'images' folder
IMAGES_DIR = "images"


def get_image_path(filename: str) -> str:
    return os.path.join(IMAGES_DIR, filename)


# Path to MediaPipe hand landmark detection model (located at root level)
model_path = "hand_landmarker.task"

# Initialize MediaPipe task options
BaseOptions = mp.tasks.BaseOptions
HandLandmarker = mp.tasks.vision.HandLandmarker
HandLandmarkerOptions = mp.tasks.vision.HandLandmarkerOptions
HandLandmarkerResult = mp.tasks.vision.HandLandmarkerResult
VisionRunningMode = mp.tasks.vision.RunningMode

detection_result = None

# Player state & control variables
is_paused = False
paused_time = 0  # Total elapsed paused duration in milliseconds
pause_start_time = 0  # Timestamp when pause mode started
volume = 5  # Initial default volume level
has_liked = False

tips_id = [4, 8, 12, 16, 20]


# Callback function to handle incoming detection results from MediaPipe
def get_result(
    result: HandLandmarkerResult, output_image: mp.Image, timestamp_ms: int
):
    global detection_result
    detection_result = result


# Function to render hand landmarks over the OpenCV frame
def draw_landmarks_on_image(rgb_image, detection_result):
    hand_landmarks_list = detection_result.hand_landmarks
    annotated_image = np.copy(rgb_image)

    for idx in range(len(hand_landmarks_list)):
        hand_landmarks = hand_landmarks_list[idx]
        hand_landmarks_proto = landmark_pb2.NormalizedLandmarkList()
        hand_landmarks_proto.landmark.extend(
            [
                landmark_pb2.NormalizedLandmark(
                    x=landmark.x, y=landmark.y, z=landmark.z
                )
                for landmark in hand_landmarks
            ]
        )
        solutions.drawing_utils.draw_landmarks(
            annotated_image,
            hand_landmarks_proto,
            solutions.hands.HAND_CONNECTIONS,
            solutions.drawing_styles.get_default_hand_landmarks_style(),
            solutions.drawing_styles.get_default_hand_connections_style(),
        )

    return annotated_image


# Pygame initialization and window configuration
pygame.init()
screen = pygame.display.set_mode((640, 800))
pygame.display.set_caption("Gesture Controlled Music Player - Practice 2")
clock = pygame.time.Clock()

# Pymunk physics world configuration
space = pymunk.Space()
space.gravity = (0, 0)  # Zero gravity for manual gesture-driven movement

# Kinematic body representing the cursor / hand position
body = pymunk.Body(body_type=pymunk.Body.KINEMATIC)
body.position = (320, 240)
circle = pymunk.Circle(body, 20)
circle.collision_type = 1
space.add(body, circle)

# Interactive UI button objects in Pymunk physics engine
# 1. Like / Heart Button
heart_body = pymunk.Body(body_type=pymunk.Body.STATIC)
heart_body.position = (225, 80)
heart_shape = pymunk.Circle(heart_body, 30)
heart_shape.collision_type = 2
space.add(heart_body, heart_shape)

# 2. Play / Pause Button
pause_body = pymunk.Body(body_type=pymunk.Body.STATIC)
pause_body.position = (325, 85)
pause_shape = pymunk.Circle(pause_body, 30)
pause_shape.collision_type = 3
space.add(pause_body, pause_shape)

# 3. Next Track Button
next_body = pymunk.Body(body_type=pymunk.Body.STATIC)
next_body.position = (425, 85)
next_shape = pymunk.Circle(next_body, 30)
next_shape.collision_type = 4
space.add(next_body, next_shape)

# 4. Volume Up Button
volumen_plus_body = pymunk.Body(body_type=pymunk.Body.STATIC)
volumen_plus_body.position = (525, 85)
volumen_plus_shape = pymunk.Circle(volumen_plus_body, 30)
volumen_plus_shape.collision_type = 5
space.add(volumen_plus_body, volumen_plus_shape)

# 5. Volume Down Button
volumen_menos_body = pymunk.Body(body_type=pymunk.Body.STATIC)
volumen_menos_body.position = (125, 85)
volumen_menos_shape = pymunk.Circle(volumen_menos_body, 30)
volumen_menos_shape.collision_type = 6
space.add(volumen_menos_body, volumen_menos_shape)

# Collision Handler: Like Button
handler_heart = space.add_collision_handler(1, 2)


def on_collision_heart(arbiter, space, data):
    global has_liked
    has_liked = not has_liked
    if has_liked:
        print("Track liked!")
    else:
        print("Like removed.")
    return True


handler_heart.begin = on_collision_heart

# Collision Handler: Pause Button
handler_pause = space.add_collision_handler(1, 3)


def on_collision_pause(arbiter, space, data):
    global is_paused, paused_time, pause_start_time

    if not is_paused:
        is_paused = True
        pause_start_time = pygame.time.get_ticks()
        print("Playback paused")
    else:
        is_paused = False
        paused_time += pygame.time.get_ticks() - pause_start_time
        print("Playback resumed")

    return True


handler_pause.begin = on_collision_pause

# Collision Handler: Next Track Button
handler_next = space.add_collision_handler(1, 4)


def on_collision_next(arbiter, space, data):
    global current_song_data, song_keys, has_liked
    selected_song_key = random.choice(song_keys)
    current_song_data = song_data[selected_song_key]
    has_liked = False  # Reset like status on track change
    print(f"Switched track to: {current_song_data['name']} (Like reset)")
    return True


handler_next.begin = on_collision_next

# Collision Handler: Volume Increase
handler_volumen_plus = space.add_collision_handler(1, 5)


def on_collision_volumen_plus(arbiter, space, data):
    global volume
    volume = min(volume + 1, 10)  # Clamp volume max value to 10
    print(f"Volume increased: {volume}")
    return True


handler_volumen_plus.begin = on_collision_volumen_plus

# Collision Handler: Volume Decrease
handler_volumen_menos = space.add_collision_handler(1, 6)


def on_collision_volumen_menos(arbiter, space, data):
    global volume
    volume = max(volume - 1, 0)  # Clamp volume min value to 0
    print(f"Volume decreased: {volume}")
    return True


handler_volumen_menos.begin = on_collision_volumen_menos

# Configure MediaPipe Hand Landmarker Options
options = HandLandmarkerOptions(
    base_options=BaseOptions(model_asset_path=model_path),
    running_mode=VisionRunningMode.LIVE_STREAM,
    result_callback=get_result,
)

# Load Pygame UI Image Assets from 'images/' folder
background_image = pygame.image.load(get_image_path("fondo.jpg"))
background_image = pygame.transform.scale(background_image, (640, 800))

circle_image = pygame.image.load(get_image_path("mano.png"))
circle_image = pygame.transform.scale(circle_image, (40, 40))

liked_heart_image = pygame.image.load(get_image_path("corazonSI.jpg"))
liked_heart_image = pygame.transform.scale(liked_heart_image, (60, 60))

unliked_heart_image = pygame.image.load(get_image_path("corazonNO.jpg"))
unliked_heart_image = pygame.transform.scale(unliked_heart_image, (60, 60))

pause_image = pygame.image.load(get_image_path("pausa.png"))
pause_image = pygame.transform.scale(pause_image, (60, 60))

next_image = pygame.image.load(get_image_path("next.png"))
next_image = pygame.transform.scale(next_image, (60, 60))

volumen_plus_image = pygame.image.load(get_image_path("mas.png"))
volumen_plus_image = pygame.transform.scale(volumen_plus_image, (65, 65))

volumen_menos_image = pygame.image.load(get_image_path("menos.png"))
volumen_menos_image = pygame.transform.scale(volumen_menos_image, (60, 60))

# Dictionary containing song metadata and album cover assets
song_data = {
    "song1": {
        "image": pygame.image.load(get_image_path("melanie.jpg")),
        "name": "Melanie Martinez - Highschool Sweathearts",
    },
    "song2": {
        "image": pygame.image.load(get_image_path("imagine-dragons.jpg")),
        "name": "Imagine Dragons - Whatever it takes",
    },
    "song3": {
        "image": pygame.image.load(get_image_path("Katy_Perry_ET_cover.png")),
        "name": "Katy Perry - E.T",
    },
    "song4": {
        "image": pygame.image.load(get_image_path("LanaRey.jpg")),
        "name": "Lana del Rey - Cinnamon Girl",
    },
    "song5": {
        "image": pygame.image.load(get_image_path("sabrina.png")),
        "name": "Sabrina Carpenter - Thumbs",
    },
    "song6": {
        "image": pygame.image.load(get_image_path("505.jpg")),
        "name": "Arctic Monkeys - 505",
    },
}

# Track selection initial configuration
song_keys = list(song_data.keys())
current_song_key = random.choice(song_keys)
current_song_data = song_data[current_song_key]

# Camera and Landmarker execution block
with HandLandmarker.create_from_options(options) as landmarker:
    cap = cv2.VideoCapture(0)
    running = True

    # Playback timer variables
    start_time = pygame.time.get_ticks()
    song_length = 3 * 60 + 20  # Total duration set to 3:20 (200 seconds)

    while cap.isOpened() and running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

        success, image = cap.read()
        if not success:
            print("Ignoring empty camera frame.")
            continue

        # Flip camera frame horizontally for intuitive mirroring
        image = cv2.flip(image, 1)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image)
        frame_timestamp_ms = int(time.time() * 1000)
        landmarker.detect_async(mp_image, frame_timestamp_ms)

        # Draw detected landmarker points if results exist
        if detection_result is not None:
            image = draw_landmarks_on_image(
                mp_image.numpy_view(), detection_result
            )

            if len(detection_result.hand_landmarks) > 0:
                landmarks = detection_result.hand_landmarks[0]

                # Index finger tip coordinate (landmark 8)
                index_finger_tip = landmarks[8]

                # Map normalized coordinates to screen dimensions
                screen_x = int(index_finger_tip.x * 640)
                screen_y = int(index_finger_tip.y * 800)

                # Clamp vertical position to keep within bounds
                screen_y = min(screen_y, 700)
                screen_x = min(max(screen_x, 0), 640)

                # Update physics body position to match hand landmark
                body.position = screen_x, screen_y

        # Step physics engine simulation
        space.step(1 / 60.0)

        # Clear screen and draw main background
        screen.fill((255, 255, 255))
        screen.blit(background_image, (0, 0))

        # Render current album cover image
        scaled_song_image = pygame.transform.scale(
            current_song_data["image"], (500, 400)
        )
        screen.blit(scaled_song_image, (70, 165))

        # Render current track title text
        font_title = pygame.font.SysFont(None, 36)
        song_title = current_song_data["name"]
        title_surface = font_title.render(song_title, True, (255, 255, 255))
        screen.blit(title_surface, (70, 620))

        # Render cursor icon over physical body position
        screen.blit(
            circle_image,
            (int(body.position.x) - 20, int(body.position.y) - 20),
        )

        # Render state-dependent Like button icon
        heart_img = liked_heart_image if has_liked else unliked_heart_image
        screen.blit(
            heart_img,
            (
                int(heart_body.position.x) - 30,
                int(heart_body.position.y) - 30,
            ),
        )

        # Render interaction UI icons
        screen.blit(
            pause_image,
            (
                int(pause_body.position.x) - 30,
                int(pause_body.position.y) - 30,
            ),
        )
        screen.blit(
            next_image,
            (int(next_body.position.x) - 30, int(next_body.position.y) - 30),
        )
        screen.blit(
            volumen_plus_image,
            (
                int(volumen_plus_body.position.x) - 30,
                int(volumen_plus_body.position.y) - 30,
            ),
        )
        screen.blit(
            volumen_menos_image,
            (
                int(volumen_menos_body.position.x) - 30,
                int(volumen_menos_body.position.y) - 30,
            ),
        )

        # Render current volume level text
        font = pygame.font.SysFont(None, 48)
        volumen_surface = font.render(
            f"Volumen: {volume}", True, (255, 255, 255)
        )
        screen.blit(volumen_surface, (250, 710))

        # Calculate playback elapsed time taking pauses into account
        if not is_paused:
            elapsed_time = (
                pygame.time.get_ticks() - start_time - paused_time
            ) / 1000
        else:
            elapsed_time = (
                pause_start_time - start_time - paused_time
            ) / 1000

        # Loop timer upon reaching song duration
        song_timer = int(elapsed_time)
        if song_timer >= song_length:
            start_time = pygame.time.get_ticks()
            paused_time = 0
            song_timer = 0

        # Format and display time strings
        minutes = song_timer // 60
        seconds = song_timer % 60
        time_text = f"{minutes:02}:{seconds:02}"
        total_time_text = "03:20"

        text_surface = font.render(time_text, True, (255, 255, 255))
        total_time_surface = font.render(
            total_time_text, True, (255, 255, 255)
        )

        screen.blit(text_surface, (75, 720))
        screen.blit(total_time_surface, (500, 720))

        # Refresh Pygame display
        pygame.display.flip()
        clock.tick(60)

        # Render OpenCV camera feed window
        cv2.imshow("MediaPipe Hands Feedback", image)
        if cv2.waitKey(5) & 0xFF == 27:  # Press ESC to exit
            break

cap.release()
cv2.destroyAllWindows()
pygame.quit()