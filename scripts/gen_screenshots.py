"""
Generate Chrome Web Store screenshots (1280x800, JPEG, no transparency)
for Aegis OmniGuard.
"""
from PIL import Image, ImageDraw, ImageFont
import os

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'screenshots')
os.makedirs(OUT_DIR, exist_ok=True)

W, H = 1280, 800

# Colors
BG_DARK = (15, 15, 26)        # #0f0f1a
ACCENT = (0, 212, 170)        # #00d4aa
ACCENT_DIM = (0, 150, 120)
WHITE = (255, 255, 255)
GRAY = (160, 160, 180)
LIGHT_GRAY = (200, 200, 210)
RED = (255, 80, 80)
RED_BG = (60, 20, 20)
ORANGE = (255, 165, 0)
ORANGE_BG = (60, 40, 10)
GREEN = (80, 255, 80)
GREEN_BG = (20, 60, 20)
DARK_CARD = (25, 25, 45)
DARKER = (10, 10, 20)
CHAT_BG = (52, 53, 65)        # ChatGPT-like
CHAT_INPUT_BG = (64, 65, 79)
TOAST_BG = (30, 30, 50)
SHIELD_GREEN = (0, 212, 170)

def try_font(size):
    """Try to load a decent font, fall back to default."""
    font_paths = [
        "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/calibri.ttf",
    ]
    for fp in font_paths:
        try:
            return ImageFont.truetype(fp, size)
        except:
            pass
    return ImageFont.load_default()

def try_bold_font(size):
    font_paths = [
        "C:/Windows/Fonts/segoeuib.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/calibrib.ttf",
    ]
    for fp in font_paths:
        try:
            return ImageFont.truetype(fp, size)
        except:
            pass
    return try_font(size)

def draw_rounded_rect(draw, xy, fill, radius=10):
    x0, y0, x1, y1 = xy
    draw.rounded_rectangle(xy, radius=radius, fill=fill)

def draw_shield(draw, cx, cy, size):
    """Draw a simplified shield icon."""
    s = size
    # Shield body
    points = [
        (cx, cy - s),           # top center
        (cx + s*0.8, cy - s*0.6),  # top right
        (cx + s*0.8, cy + s*0.1),  # mid right
        (cx, cy + s),              # bottom center (point)
        (cx - s*0.8, cy + s*0.1),  # mid left
        (cx - s*0.8, cy - s*0.6),  # top left
    ]
    draw.polygon(points, fill=ACCENT)
    # Inner shield (darker)
    inner_s = s * 0.7
    inner_points = [
        (cx, cy - inner_s),
        (cx + inner_s*0.8, cy - inner_s*0.6),
        (cx + inner_s*0.8, cy + inner_s*0.1),
        (cx, cy + inner_s),
        (cx - inner_s*0.8, cy + inner_s*0.1),
        (cx - inner_s*0.8, cy - inner_s*0.6),
    ]
    draw.polygon(inner_points, fill=BG_DARK)
    # Checkmark inside
    check_points = [
        (cx - s*0.25, cy - s*0.05),
        (cx - s*0.05, cy + s*0.25),
        (cx + s*0.35, cy - s*0.3),
    ]
    draw.line(check_points, fill=ACCENT, width=max(3, int(s*0.12)))


# ============================
# Screenshot 1: Hero - Main value proposition
# ============================
def gen_screenshot_1():
    img = Image.new('RGB', (W, H), BG_DARK)
    draw = ImageDraw.Draw(img)

    font_huge = try_bold_font(52)
    font_big = try_bold_font(36)
    font_med = try_font(24)
    font_small = try_font(20)
    font_tag = try_bold_font(16)

    # Title area
    draw_shield(draw, 640, 100, 50)
    draw.text((640, 170), "Aegis OmniGuard", fill=WHITE, font=font_huge, anchor="mt")
    draw.text((640, 230), "AI-Era Data Sovereignty Guardian", fill=ACCENT, font=font_med, anchor="mt")

    # Tagline
    draw.text((640, 290), "Stop leaking your secrets to AI — automatically.", fill=GRAY, font=font_med, anchor="mt")

    # Feature cards row
    cards = [
        ("Zero Cloud", "All scanning happens\nlocally in your browser", ACCENT),
        ("Zero Cost", "100% free & open source\nMIT License", SHIELD_GREEN),
        ("Zero Config", "Install and forget\nIt just works", ACCENT_DIM),
    ]

    card_w = 340
    card_h = 150
    start_x = (W - 3 * card_w - 2 * 30) // 2
    card_y = 350

    for i, (title, desc, color) in enumerate(cards):
        x = start_x + i * (card_w + 30)
        draw_rounded_rect(draw, (x, card_y, x + card_w, card_y + card_h), DARK_CARD, 12)
        # Color accent bar on top
        draw.rounded_rectangle((x, card_y, x + card_w, card_y + 4), radius=2, fill=color)
        draw.text((x + card_w//2, card_y + 35), title, fill=color, font=font_big, anchor="mt")
        for j, line in enumerate(desc.split('\n')):
            draw.text((x + card_w//2, card_y + 80 + j*26), line, fill=GRAY, font=font_small, anchor="mt")

    # Detection types grid
    det_y = 550
    draw.text((640, det_y), "What It Detects", fill=WHITE, font=font_big, anchor="mt")

    detections = [
        "Credit Cards (Luhn)", "API Keys (5 platforms)", "Crypto Mnemonics (BIP-39)",
        "Private Keys (Entropy)", ".env Secrets", "ID Cards (Checksum)",
    ]

    cols = 3
    tag_w = 320
    tag_h = 42
    tag_start_x = (W - cols * tag_w - (cols-1) * 20) // 2

    for i, det in enumerate(detections):
        row = i // cols
        col = i % cols
        x = tag_start_x + col * (tag_w + 20)
        y = det_y + 50 + row * (tag_h + 15)
        draw_rounded_rect(draw, (x, y, x + tag_w, y + tag_h), DARK_CARD, 8)
        draw.text((x + 15, y + tag_h//2), "✓", fill=ACCENT, font=font_med, anchor="lm")
        draw.text((x + 45, y + tag_h//2), det, fill=LIGHT_GRAY, font=font_small, anchor="lm")

    # Bottom tagline
    draw.text((640, 750), "Open Source  ·  MIT License  ·  github.com/bidaiAI/aegis-omniguard", fill=GRAY, font=font_small, anchor="mt")

    img.save(os.path.join(OUT_DIR, 'screenshot_1_hero.jpg'), 'JPEG', quality=95)
    print("screenshot_1_hero.jpg created")


# ============================
# Screenshot 2: Live interception demo
# ============================
def gen_screenshot_2():
    img = Image.new('RGB', (W, H), CHAT_BG)
    draw = ImageDraw.Draw(img)

    font_big = try_bold_font(32)
    font_med = try_font(22)
    font_small = try_font(18)
    font_mono = try_font(20)
    font_title = try_bold_font(18)
    font_toast_title = try_bold_font(20)

    # Top bar - simulated ChatGPT-like header
    draw.rectangle((0, 0, W, 60), fill=(32, 33, 35))
    draw.text((30, 30), "ChatGPT", fill=WHITE, font=font_big, anchor="lm")

    # Shield icon in top right to show extension is active
    draw_rounded_rect(draw, (W-200, 10, W-10, 50), ACCENT, 8)
    draw.text((W-105, 30), "Aegis Active", fill=BG_DARK, font=font_title, anchor="mm")

    # Chat area
    # User message with sensitive data
    msg_y = 120
    draw_rounded_rect(draw, (600, msg_y, W-60, msg_y+160), CHAT_INPUT_BG, 12)
    draw.text((620, msg_y + 20), "You:", fill=ACCENT, font=font_title)
    draw.text((620, msg_y + 50), "Hey, can you help me debug this payment issue?", fill=WHITE, font=font_med)
    draw.text((620, msg_y + 80), "My card number is 4111 1111 1111 1111", fill=WHITE, font=font_med)
    draw.text((620, msg_y + 110), "and my API key is sk-proj-abc123xyz789def456", fill=WHITE, font=font_med)
    # Strikethrough on sensitive data
    draw.line((819, msg_y + 93, 1135, msg_y + 93), fill=RED, width=2)
    draw.line((770, msg_y + 123, 1130, msg_y + 123), fill=RED, width=2)

    # Arrow showing interception
    arrow_y = msg_y + 200
    draw.text((640, arrow_y), "⬇  INTERCEPTED BY AEGIS  ⬇", fill=RED, font=font_big, anchor="mt")

    # Masked result
    mask_y = arrow_y + 60
    draw_rounded_rect(draw, (600, mask_y, W-60, mask_y+130), GREEN_BG, 12)
    draw.text((620, mask_y + 15), "What AI actually receives:", fill=GREEN, font=font_title)
    draw.text((620, mask_y + 50), "My card number is **** **** **** 1111", fill=WHITE, font=font_med)
    draw.text((620, mask_y + 80), "and my API key is sk-pr************789", fill=WHITE, font=font_med)

    # Toast notification (bottom right)
    toast_y = 550
    toast_x = 60
    toast_w = 480
    toast_h = 200
    draw_rounded_rect(draw, (toast_x, toast_y, toast_x + toast_w, toast_y + toast_h), TOAST_BG, 12)
    # Red accent bar
    draw.rounded_rectangle((toast_x, toast_y, toast_x + toast_w, toast_y + 4), radius=2, fill=RED)

    draw.text((toast_x + 20, toast_y + 30), "🛡 Aegis OmniGuard", fill=ACCENT, font=font_toast_title)
    draw.text((toast_x + 20, toast_y + 65), "Blocked: Credit Card Number", fill=RED, font=font_med)
    draw.text((toast_x + 20, toast_y + 95), "Confidence: 98%", fill=GRAY, font=font_small)
    draw.text((toast_x + 20, toast_y + 120), "Original: 4111 1111 1111 1111", fill=GRAY, font=font_small)
    draw.text((toast_x + 20, toast_y + 145), "Masked:   **** **** **** 1111", fill=GREEN, font=font_small)
    draw.text((toast_x + toast_w - 20, toast_y + 30), "✕", fill=GRAY, font=font_med, anchor="rt")

    # Second toast
    toast2_y = toast_y - 120
    draw_rounded_rect(draw, (toast_x, toast2_y, toast_x + toast_w, toast2_y + 100), TOAST_BG, 12)
    draw.rounded_rectangle((toast_x, toast2_y, toast_x + toast_w, toast2_y + 4), radius=2, fill=ORANGE)
    draw.text((toast_x + 20, toast2_y + 30), "🛡 Blocked: API Key (OpenAI)", fill=ORANGE, font=font_med)
    draw.text((toast_x + 20, toast2_y + 60), "sk-proj-abc123... → sk-pr*******...", fill=GRAY, font=font_small)

    img.save(os.path.join(OUT_DIR, 'screenshot_2_interception.jpg'), 'JPEG', quality=95)
    print("screenshot_2_interception.jpg created")


# ============================
# Screenshot 3: Dashboard + Architecture
# ============================
def gen_screenshot_3():
    img = Image.new('RGB', (W, H), BG_DARK)
    draw = ImageDraw.Draw(img)

    font_big = try_bold_font(32)
    font_med = try_font(22)
    font_small = try_font(18)
    font_title = try_bold_font(20)
    font_section = try_bold_font(26)

    # Left side: Popup mockup
    popup_x, popup_y = 80, 80
    popup_w, popup_h = 380, 620

    # Popup frame
    draw_rounded_rect(draw, (popup_x, popup_y, popup_x + popup_w, popup_y + popup_h), DARK_CARD, 16)
    draw.rounded_rectangle((popup_x, popup_y, popup_x + popup_w, popup_y + 4), radius=2, fill=ACCENT)

    # Popup header
    draw_shield(draw, popup_x + popup_w//2, popup_y + 50, 25)
    draw.text((popup_x + popup_w//2, popup_y + 90), "Aegis OmniGuard", fill=WHITE, font=font_big, anchor="mt")

    # Toggle switch
    toggle_y = popup_y + 150
    draw_rounded_rect(draw, (popup_x + 30, toggle_y, popup_x + popup_w - 30, toggle_y + 50), (20, 60, 50), 25)
    draw.text((popup_x + 60, toggle_y + 25), "Protection Shield", fill=WHITE, font=font_title, anchor="lm")
    # ON indicator
    draw.ellipse((popup_x + popup_w - 80, toggle_y + 8, popup_x + popup_w - 46, toggle_y + 42), fill=ACCENT)
    draw.text((popup_x + popup_w - 63, toggle_y + 25), "ON", fill=BG_DARK, font=try_bold_font(12), anchor="mm")

    # Protection level
    level_y = toggle_y + 70
    draw.text((popup_x + 30, level_y), "Protection Level", fill=GRAY, font=font_small)
    levels = [("Low", False), ("Medium", True), ("High", False)]
    for i, (label, active) in enumerate(levels):
        bx = popup_x + 30 + i * 110
        by = level_y + 30
        if active:
            draw_rounded_rect(draw, (bx, by, bx + 100, by + 36), ACCENT, 8)
            draw.text((bx + 50, by + 18), label, fill=BG_DARK, font=font_title, anchor="mm")
        else:
            draw_rounded_rect(draw, (bx, by, bx + 100, by + 36), (40, 40, 60), 8)
            draw.text((bx + 50, by + 18), label, fill=GRAY, font=font_small, anchor="mm")

    # Stats
    stat_y = level_y + 90
    draw.text((popup_x + 30, stat_y), "Today's Interceptions", fill=GRAY, font=font_small)

    stats = [
        ("Credit Cards", "3", RED),
        ("API Keys", "7", ORANGE),
        ("Mnemonics", "1", (255, 200, 0)),
        (".env Secrets", "2", ACCENT),
    ]
    for i, (label, count, color) in enumerate(stats):
        sy = stat_y + 30 + i * 44
        draw_rounded_rect(draw, (popup_x + 30, sy, popup_x + popup_w - 30, sy + 38), (30, 30, 50), 8)
        draw.text((popup_x + 50, sy + 19), label, fill=LIGHT_GRAY, font=font_small, anchor="lm")
        draw_rounded_rect(draw, (popup_x + popup_w - 80, sy + 6, popup_x + popup_w - 40, sy + 32), color, 6)
        draw.text((popup_x + popup_w - 60, sy + 19), count, fill=BG_DARK, font=font_title, anchor="mm")

    # Quick links
    link_y = stat_y + 215
    for i, label in enumerate(["View Logs", "Whitelist"]):
        ly = link_y + i * 45
        draw_rounded_rect(draw, (popup_x + 30, ly, popup_x + popup_w - 30, ly + 38), (30, 30, 50), 8)
        draw.text((popup_x + popup_w//2, ly + 19), label, fill=ACCENT, font=font_title, anchor="mm")

    # Right side: How it works
    right_x = 540
    draw.text((right_x + 300, 100), "How It Works", fill=WHITE, font=try_bold_font(38), anchor="mt")

    # Flow diagram
    steps = [
        ("1", "You Type / Paste", "Text entered in any AI chat", ACCENT),
        ("2", "Content Script", "Captures keydown, paste & click events", (100, 150, 255)),
        ("3", "DLP Engine Scan", "Regex pre-filter + algorithmic verification", ORANGE),
        ("4", "Decision", "Pass (safe) or Block (sensitive detected)", RED),
        ("5", "Protection", "Mask data + Toast alert + Log event", GREEN),
    ]

    step_start_y = 180
    step_h = 95
    step_w = 600

    for i, (num, title, desc, color) in enumerate(steps):
        sy = step_start_y + i * (step_h + 15)
        sx = right_x + 10

        # Step box
        draw_rounded_rect(draw, (sx, sy, sx + step_w, sy + step_h), DARK_CARD, 10)
        draw.rounded_rectangle((sx, sy, sx + 4, sy + step_h), radius=2, fill=color)

        # Number circle
        draw.ellipse((sx + 20, sy + step_h//2 - 18, sx + 56, sy + step_h//2 + 18), fill=color)
        draw.text((sx + 38, sy + step_h//2), num, fill=BG_DARK, font=font_big, anchor="mm")

        # Text
        draw.text((sx + 75, sy + 25), title, fill=WHITE, font=font_title)
        draw.text((sx + 75, sy + 55), desc, fill=GRAY, font=font_small)

        # Arrow between steps
        if i < len(steps) - 1:
            arrow_x = sx + step_w // 2
            arrow_top = sy + step_h + 2
            draw.text((arrow_x, arrow_top + 5), "▼", fill=color, font=font_small, anchor="mt")

    # Bottom bar
    draw.rectangle((0, H - 45, W, H), fill=DARKER)
    draw.text((640, H - 22), "100% Local  ·  Zero Cloud  ·  Open Source  ·  MIT License  ·  @bidaoofficial", fill=GRAY, font=font_small, anchor="mm")

    img.save(os.path.join(OUT_DIR, 'screenshot_3_dashboard.jpg'), 'JPEG', quality=95)
    print("screenshot_3_dashboard.jpg created")


if __name__ == '__main__':
    gen_screenshot_1()
    gen_screenshot_2()
    gen_screenshot_3()
    print(f"\nAll screenshots saved to: {OUT_DIR}")
    print("Size: 1280x800, Format: JPEG (no transparency)")
    print("Ready for Chrome Web Store upload!")
