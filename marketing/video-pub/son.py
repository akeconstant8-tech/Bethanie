"""Bande-son de la vidéo Béthanie : musique composée par programme (afro-house, 128 battements par minute,
fa dièse mineur / la majeur), effets sonores placés aux repères de l'animation (cues.json, produit par rendu.mjs) et
voix off française placée phrase par phrase sur les scènes, la musique s'effaçant sous la voix.
Aucun échantillon musical extérieur : la musique et les effets sont synthétisés ici, donc libres de droits.

Usage : python son.py cues.json sortie.wav [voix.wav]   (voix déjà accélérée de 12 % et à 48 kHz, voir rendu.mjs)
"""
import json
import sys

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, istft, sosfilt, stft

SR = 48000
BPM = 128
BEAT = 60 / BPM
SIX = BEAT / 4  # double croche
BAR = BEAT * 4
DUR = 68 * BEAT  # 17 mesures, 31,9 s
N = int((DUR + 2.5) * SR)  # marge pour les queues de réverbération, coupée à la fin
RNG = np.random.default_rng(7)


def tt(d):
    return np.arange(int(d * SR)) / SR


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, 'lowpass', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, 'highpass', fs=SR, output='sos'), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], 'bandpass', fs=SR, output='sos'), x)


class Bus:
    """Piste stéréo ; `send` alimente la réverbération commune."""

    def __init__(self):
        self.l = np.zeros(N)
        self.r = np.zeros(N)

    def add(self, sig, t, gain=1.0, pan=0.0, send=None, send_amt=0.0):
        i = int(round(t * SR))
        if i >= N or i < 0:
            return
        n = min(len(sig), N - i)
        gl = np.cos((pan + 1) * np.pi / 4) * np.sqrt(2) * gain
        gr = np.sin((pan + 1) * np.pi / 4) * np.sqrt(2) * gain
        self.l[i:i + n] += sig[:n] * gl
        self.r[i:i + n] += sig[:n] * gr
        if send is not None and send_amt:
            send.l[i:i + n] += sig[:n] * gl * send_amt
            send.r[i:i + n] += sig[:n] * gr * send_amt


drums, bass, keys, pads, sfx, verb = Bus(), Bus(), Bus(), Bus(), Bus(), Bus()


def add_stereo(bus, left, right, t, gain=1.0):
    i = int(round(t * SR))
    n = min(len(left), N - i)
    if n > 0:
        bus.l[i:i + n] += left[:n] * gain
        bus.r[i:i + n] += right[:n] * gain

# ------------------------------------------------------------------
# Instruments
# ------------------------------------------------------------------


def kick(vel=1.0):
    t = tt(0.45)
    f = 47 + 125 * np.exp(-t * 38)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6.2)
    click = hp(RNG.standard_normal(len(t)), 2500) * np.exp(-t * 700) * 0.35
    s = np.tanh((body + click) * 1.8) / np.tanh(1.8)
    return s * vel


def clap():
    t = tt(0.4)
    n = bp(RNG.standard_normal(len(t)), 900, 4200)
    env = np.zeros_like(t)
    for k, off in enumerate([0, 0.011, 0.022]):
        env += np.where(t >= off, np.exp(-(t - off) * 150), 0) * (0.75 if k < 2 else 1.0)
    env += np.where(t >= 0.022, np.exp(-(t - 0.022) * 15), 0) * 0.45
    return n * env * 0.7


def shaker(vel):
    t = tt(0.09)
    n = hp(RNG.standard_normal(len(t)), 6500)
    env = np.minimum(1, t / 0.006) * np.exp(-t * 55)
    return n * env * vel


def hat(vel):
    t = tt(0.2)
    n = hp(RNG.standard_normal(len(t)), 8000)
    return n * np.minimum(1, t / 0.003) * np.exp(-t * 22) * vel


def conga(f0, vel):
    t = tt(0.5)
    f = f0 * (1 + 0.32 * np.exp(-t * 45))
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 12)
    slap = bp(RNG.standard_normal(len(t)), 1800, 5000) * np.exp(-t * 200) * 0.25
    return (tone + slap) * vel


def rim(vel):
    t = tt(0.12)
    s = (np.sin(2 * np.pi * 1750 * t) * 0.6 + np.sin(2 * np.pi * 820 * t) * 0.4) * np.exp(-t * 70)
    s += hp(RNG.standard_normal(len(t)), 3000) * np.exp(-t * 500) * 0.3
    return s * vel


def log_drum(m, length):
    """Basse « log drum » (amapiano) : attaque qui glisse d'une octave vers la note, un peu saturée."""
    t = tt(length + 0.3)
    f0 = mtof(m)
    f = f0 * (1 + 1.0 * np.exp(-t * 55))
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) + 0.45 * np.sin(2 * ph) + 0.22 * np.sin(3 * ph) + 0.08 * np.sin(4 * ph)
    rel = np.clip(1 - (t - length) / 0.12, 0, 1)
    env = np.minimum(1, t / 0.004) * np.exp(-t * 4.2) * rel
    s = np.tanh(2.4 * s * env) / np.tanh(2.4)
    return lp(s, 1800)


def marimba(m, vel=1.0, length=1.6):
    """Lames de bois (marimba / balafon) : trois partiels qui s'éteignent à des vitesses différentes, attaque du maillet."""
    t = tt(length)
    f = mtof(m)
    s = np.zeros_like(t)
    for ratio, amp, decay in [(1.0, 1.0, 3.2), (3.93, 0.32, 10.0), (9.2, 0.10, 22.0), (2.0, 0.08, 6.0)]:
        if f * ratio < 16000:
            s += amp * np.sin(2 * np.pi * f * ratio * t) * np.exp(-t * decay)
    # léger « bourdonnement » du balafon (calebasses) : battement de deux fréquences voisines
    s += 0.06 * np.sin(2 * np.pi * f * 1.006 * t) * np.exp(-t * 4)
    mallet = bp(RNG.standard_normal(len(t)), 1500, 6000) * np.exp(-t * 380) * 0.18
    return (s * np.minimum(1, t / 0.0018) + mallet) * vel


def bell(f, vel=1.0, length=1.6, ratio=1.4, index=2.2):
    """Cloche (FM) : sons de réussite et de caisse."""
    t = tt(length)
    mod = index * np.exp(-t * 3) * np.sin(2 * np.pi * f * ratio * t)
    return np.sin(2 * np.pi * f * t + mod) * np.exp(-t * 3.2) * np.minimum(1, t / 0.002) * vel


def pad(notes, length, cutoff=1900, seed=0):
    """Nappe : scies désaccordées (additives), attaque lente, filtrée ; stéréo par phases différentes."""
    t = tt(length + 0.9)
    out = []
    for side in range(2):
        rng = np.random.default_rng(seed * 10 + side)
        s = np.zeros_like(t)
        for m in notes:
            for det in (-0.09, 0.0, 0.09):
                f = mtof(m + det)
                ph = rng.uniform(0, 2 * np.pi)
                for k in range(1, 14):
                    if f * k > 8000:
                        break
                    s += np.sin(2 * np.pi * f * k * t + ph * k) / k
        env = np.minimum(1, t / 0.4) * np.clip(1 - (t - length) / 0.8, 0, 1)
        out.append(lp(s * env, cutoff) / (len(notes) * 3))
    return out


def noise_sweep(length, f_start, f_end, width=0.7, shape='rise'):
    """Bruit filtré dont la fréquence glisse (montées, souffles) — filtrage dans le domaine fréquentiel."""
    n = int(length * SR)
    x = RNG.standard_normal(n + 4096)
    f, frames, Z = stft(x, SR, nperseg=2048)
    for j, tj in enumerate(frames):
        p = np.clip(tj / length, 0, 1)
        if shape == 'hump':
            fc = f_start * (f_end / f_start) ** (np.sin(np.pi * p))
        else:
            fc = f_start * (f_end / f_start) ** p
        Z[:, j] *= np.exp(-0.5 * ((np.log2(f + 20) - np.log2(fc)) / width) ** 2)
    _, y = istft(Z, SR, nperseg=2048)
    y = y[:n]
    return y / (np.max(np.abs(y)) + 1e-9)


# ------------------------------------------------------------------
# Musique
# ------------------------------------------------------------------

CHORDS = {
    'F#m': {'pad': [54, 57, 61, 64], 'root': 42, 'mel': [66, 69, 73, 76]},
    'D': {'pad': [50, 57, 61, 66], 'root': 38, 'mel': [62, 66, 69, 73]},
    'A': {'pad': [57, 61, 64, 71], 'root': 45, 'mel': [64, 69, 73, 76]},
    'E': {'pad': [52, 59, 64, 68], 'root': 40, 'mel': [64, 68, 71, 76]},
}
PROG = ['F#m', 'D'] + ['F#m', 'D', 'A', 'E'] * 3 + ['A', 'E', 'A']  # 17 mesures
SWING = 0.12 * SIX


def pos(bar, six):
    """Instant (s) d'une double croche ; les contretemps sont légèrement retardés (swing)."""
    return bar * BAR + six * SIX + (SWING if six % 2 else 0)


kick_times = []
for bar, name in enumerate(PROG):
    c = CHORDS[name]
    intro = bar < 2
    breakdown = bar == 12
    build = bar == 13
    final = bar == 16
    # Nappe (plus fermée pendant l'ouverture, qui s'ouvre progressivement)
    cutoff = 700 + 900 * (bar / 2) if intro else (1300 if breakdown else 1900)
    pl, pr = pad(c['pad'], BAR * (2 if final else 1), cutoff, seed=bar)
    add_stereo(pads, pl, pr, bar * BAR)
    if final:
        # Accord final : arpège de lames juste après le dernier mot de la voix (« bénissez »), puis il résonne.
        for i, m in enumerate(c['mel'] + [81]):
            keys.add(marimba(m, 0.9, 3.0), bar * BAR + 1.0 + i * 0.06, 0.55, pan=-0.4 + i * 0.2, send=verb, send_amt=0.45)
        kick_times.append(bar * BAR)
        drums.add(kick(1.0), bar * BAR, 0.9)
        bass.add(log_drum(c['root'], 1.2), bar * BAR, 0.6)
        continue
    # Mélodie de lames de bois
    pattern = [(0, 0), (3, 1), (6, 2), (8, 3), (10, 2), (12, 1), (14, 2)]
    if bar % 2 == 1:
        pattern = [(0, 3), (2, 2), (4, 1), (7, 2), (10, 3), (12, 2), (14, 1)]
    for six, k in pattern:
        if intro and six % 4:
            continue  # ouverture : seulement sur les temps
        m = c['mel'][k] + (12 if (bar >= 6 and six in (8, 10) and bar % 4 == 0) else 0)
        vel = 0.9 if six % 4 == 0 else 0.7
        keys.add(marimba(m, vel), pos(bar, six), 0.6, pan=(-0.35 if k % 2 else 0.35), send=verb, send_amt=0.3)
    if intro:
        continue
    # Batterie
    for six in range(16):
        t0 = pos(bar, six)
        if six % 4 == 0 and not breakdown:
            if build and six < 8:
                continue
            drums.add(kick(1.0 if six == 0 else 0.9), t0, 0.72)
            kick_times.append(bar * BAR + six * SIX)
        if six in (4, 12) and not breakdown and not build:
            drums.add(clap(), t0, 0.62, pan=0.05, send=verb, send_amt=0.25)
        acc = 0.5 if six % 4 == 2 else (0.32 if six % 2 else 0.22)
        drums.add(shaker(acc * (0.6 if breakdown else 1.0)), t0, 0.4, pan=0.45)
        if not breakdown and six in (2, 6, 10, 14):
            drums.add(hat(0.8), t0, 0.3, pan=-0.2)
        if not breakdown and six in (7, 15):
            drums.add(conga(300, 0.6), t0, 0.45, pan=-0.3)
        if not breakdown and six in (2, 10):
            drums.add(conga(205, 0.6), t0, 0.45, pan=-0.45)
        if not breakdown and six in (3, 11) and bar % 2:
            drums.add(rim(0.5), t0, 0.3, pan=0.3)
    # Montée vers la fin : roulement de clap en doubles croches qui s'intensifie
    if build:
        for six in range(8, 16):
            drums.add(clap(), pos(bar, six), 0.12 + 0.05 * (six - 8), pan=0.05, send=verb, send_amt=0.2)
    # Basse « log drum »
    if not breakdown:
        for six, interval, length in [(0, 0, 0.3), (3, 0, 0.22), (6, 0, 0.3), (10, 12, 0.2), (11, 0, 0.25), (14, 7, 0.2)]:
            bass.add(log_drum(c['root'] + interval, length), pos(bar, six), 0.5)

# Montées (ouverture et fin de la partie vendeurs) et cymbale inversée avant chaque arrivée
for start_beat, length_beats in [(4, 4), (52, 4)]:
    r = noise_sweep(length_beats * BEAT, 300, 7000, 0.6) * np.linspace(0, 1, int(length_beats * BEAT * SR)) ** 2
    pads.add(hp(r, 200), start_beat * BEAT, 0.22, send=verb, send_amt=0.3)
    t = tt(length_beats * BEAT)
    rev = hp(RNG.standard_normal(len(t)), 4000) * np.exp((t - t[-1]) * 3.5)
    drums.add(rev, start_beat * BEAT, 0.18, pan=0.2)

# Compression « respirante » : nappe et lames s'effacent un peu à chaque grosse caisse.
duck = np.zeros(N)
idx = np.arange(int(0.5 * SR))
shape = np.exp(-idx / SR * 9)
for k in kick_times:
    i = int(k * SR)
    n = min(len(shape), N - i)
    duck[i:i + n] = np.maximum(duck[i:i + n], shape[:n])
gain = 1 - 0.45 * duck
for b in (pads, keys):
    b.l *= gain
    b.r *= gain

# ------------------------------------------------------------------
# Effets sonores (repères de l'animation)
# ------------------------------------------------------------------


def impact():
    t = tt(2.4)
    f = 62 * np.exp(-t * 0.9) + 26
    boom = np.tanh(2 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.0))
    crash = hp(RNG.standard_normal(len(t)), 3000) * np.exp(-t * 2.2) * 0.45
    return boom * 0.9 + crash


def whoosh(length=0.55, lo=350, hi=3200):
    s = noise_sweep(length, lo, hi, 0.55, 'hump')
    env = np.sin(np.pi * np.linspace(0, 1, len(s))) ** 1.5
    return s * env


def pop_sound(pitch=1.0):
    t = tt(0.16)
    f = (380 + 600 * (1 - np.exp(-t * 40))) * pitch
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 32)
    return s + hp(RNG.standard_normal(len(t)), 4000) * np.exp(-t * 900) * 0.15


def tap_sound():
    t = tt(0.08)
    s = np.sin(2 * np.pi * 2300 * t) * np.exp(-t * 300) * 0.5
    s += np.sin(2 * np.pi * 130 * t) * np.exp(-t * 90) * 0.6
    return s + hp(RNG.standard_normal(len(t)), 5000) * np.exp(-t * 1200) * 0.3


def tick_sound():
    s = marimba(88, 0.8, 0.5) * 0.7
    tap = tap_sound() * 0.4
    s[:len(tap)] += tap
    return s


def shimmer():
    t = tt(2.0)
    s = hp(noise_sweep(2.0, 2000, 9000, 0.5), 2500) * np.minimum(1, t / 1.2) * np.exp(-np.clip(t - 1.2, 0, None) * 3) * 0.35
    for i in range(18):
        start = 0.05 + i * 0.07
        ping = bell(mtof(84 + (i * 5) % 14), 0.25, 0.8, ratio=2.01, index=0.6)
        j = int(start * SR)
        n = min(len(ping), len(s) - j)
        s[j:j + n] += ping[:n]
    return s


def success():
    out = np.zeros(int(2.0 * SR))
    for i, m in enumerate([81, 85, 88, 93]):
        b = marimba(m, 0.9, 1.5) + bell(mtof(m), 0.25, 1.5, ratio=3.0, index=1.0)
        j = int(i * 0.075 * SR)
        n = min(len(b), len(out) - j)
        out[j:j + n] += b[:n]
    return out


def kaching():
    out = np.zeros(int(1.6 * SR))
    for i, f in enumerate([2093, 2637, 3136]):
        b = bell(f, 0.6, 1.2, ratio=1.41, index=1.6)
        j = int(i * 0.05 * SR)
        n = min(len(b), len(out) - j)
        out[j:j + n] += b[:n]
    for k in range(10):  # pièces qui tintent
        t = tt(0.06)
        c = bp(RNG.standard_normal(len(t)), 5000, 11000) * np.exp(-t * 120) * 0.35
        j = int((0.04 + k * 0.035) * SR)
        out[j:j + len(c)] += c
    return out


def fly():
    s = whoosh(0.7, 500, 2600) * 0.7
    t = tt(0.7)
    s += np.sin(2 * np.pi * np.cumsum(600 + 900 * t / 0.7) / SR) * np.sin(np.pi * t / 0.7) * 0.15
    return s


cues = json.load(open(sys.argv[1], encoding='utf-8'))
cues.append({'t': int(8 * BEAT * 1000), 'type': 'impact'})  # arrivée du rythme
for c in cues:
    t0 = c['t'] / 1000
    kind = c['type']
    if kind == 'impact':
        sfx.add(impact(), t0, 0.75, send=verb, send_amt=0.35)
    elif kind == 'whoosh':
        sfx.add(whoosh(), t0 - 0.2, 0.32 * c.get('gain', 1.0), pan=0.2)
    elif kind == 'riseSwoosh':
        sfx.add(whoosh(0.9, 250, 2400), t0 - 0.1, 0.36)
    elif kind == 'swipe':
        sfx.add(whoosh(0.28, 900, 5200), t0 - 0.05, 0.2, pan=-0.3)
    elif kind == 'scroll':
        sfx.add(whoosh(0.45, 1500, 4500), t0, 0.08, pan=0.1)
    elif kind == 'pop':
        sfx.add(pop_sound(c.get('pitch', 1.0)), t0, 0.32, pan=0.0, send=verb, send_amt=0.15)
    elif kind == 'tick':
        sfx.add(tick_sound(), t0, 0.4, send=verb, send_amt=0.2)
    elif kind == 'tap':
        sfx.add(tap_sound(), t0, 0.5)
    elif kind == 'fly':
        sfx.add(fly(), t0, 0.35, pan=-0.2)
    elif kind == 'bling':
        sfx.add(bell(1760, 0.5, 1.2, ratio=2.0, index=1.2), t0, 0.35, send=verb, send_amt=0.3)
    elif kind == 'success':
        sfx.add(success(), t0, 0.42, send=verb, send_amt=0.35)
    elif kind == 'kaching':
        sfx.add(kaching(), t0, 0.4, send=verb, send_amt=0.3)
    elif kind == 'shimmer':
        sfx.add(shimmer(), t0, 0.5, send=verb, send_amt=0.4)

# ------------------------------------------------------------------
# Voix off : chaque phrase sur sa scène ; la musique s'efface sous la voix
# ------------------------------------------------------------------
TEMPO = 1.12
# Phrases de la voix d'origine (début, fin en s, relevés par reconnaissance vocale) → instant d'arrivée dans la vidéo.
PHRASES = [
    (0.09, 5.04, 0.45),    # « Bienvenue sur Béthanie, la place de marché… »          ouverture
    (5.79, 10.80, 6.10),   # « Découvrez des produits vérifiés, explorez les catégories… »  promesse → accueil
    (11.49, 14.70, 11.65), # « Chaque fiche vous aide à mieux connaître le produit… »  fiche produit
    (15.48, 22.65, 15.15), # « En quelques gestes, passez votre commande, payez… suivez la livraison… »
    (23.40, 24.48, 22.65), # « Vous êtes vendeur ? »
    (25.23, 30.21, 23.95), # « Ouvrez gratuitement votre boutique… »
    (30.99, 33.66, 28.60), # « Avec Béthanie, achetez, vendez et bénissez. »
]
voice = Bus()
activity = np.zeros(N)
if len(sys.argv) > 3:
    vsr, v = wavfile.read(sys.argv[3])
    v = v.astype(np.float64)
    if v.ndim > 1:
        v = v.mean(axis=1)
    v /= 32768.0
    v = hp(v, 90)
    v = v + 0.3 * bp(v, 2000, 5000)  # présence (intelligibilité sur téléphone)
    for start, end, target in PHRASES:
        a = int(max(0, start / TEMPO - 0.06) * vsr)
        b = int(min(len(v) / vsr, end / TEMPO + 0.12) * vsr)
        seg = v[a:b].copy()
        fade = int(0.015 * vsr)
        seg[:fade] *= np.linspace(0, 1, fade)
        seg[-fade:] *= np.linspace(1, 0, fade)
        rms = np.sqrt(np.mean(seg ** 2)) + 1e-9
        seg = np.tanh(seg * (0.28 / rms) * 1.2) / 1.2  # même niveau pour chaque phrase, crêtes adoucies
        t0 = target - 0.06
        voice.add(seg, t0, 1.8, send=verb, send_amt=0.05)
        i0, i1 = int(t0 * SR), min(N, int((t0 + len(seg) / vsr) * SR))
        activity[i0:i1] = 1.0
    # Enveloppe d'effacement : arrive en 0,12 s, repart en 0,35 s.
    smooth = np.zeros(N)
    level = 0.0
    up, down = 1 / (0.12 * SR), 1 / (0.35 * SR)
    for i in range(0, N, 64):
        target_level = activity[i]
        level = min(target_level, level + up * 64) if target_level > level else max(target_level, level - down * 64)
        smooth[i:i + 64] = level
    music_gain = 1 - 0.65 * smooth   # environ -9 dB sous la voix
    sfx_gain = 1 - 0.3 * smooth
    for b in (drums, bass, keys, pads):
        b.l *= music_gain
        b.r *= music_gain
    sfx.l *= sfx_gain
    sfx.r *= sfx_gain
    print(f'voix off : {len(PHRASES)} phrases placées')
    mask = activity > 0
    db = lambda x: 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
    music_under = drums.l[mask] * 0.95 + bass.l[mask] * 0.8 + keys.l[mask] + pads.l[mask] * 0.95
    print(f'niveau pendant la voix : voix {db(voice.l[mask]):.1f} dB, musique {db(music_under):.1f} dB')

# ------------------------------------------------------------------
# Réverbération, mixage, mastering
# ------------------------------------------------------------------
ir_t = tt(1.8)
ir = []
for side in range(2):
    rng = np.random.default_rng(100 + side)
    x = rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 3.6)
    x = lp(x, 6000)
    x[: int(0.015 * SR)] = 0  # pré-délai
    ir.append(x / np.sqrt(np.sum(x ** 2)))
wet_l = fftconvolve(verb.l, ir[0])[:N] * 0.9
wet_r = fftconvolve(verb.r, ir[1])[:N] * 0.9

levels = {'drums': 0.95, 'bass': 0.8, 'keys': 1.0, 'pads': 0.95, 'sfx': 1.0, 'voice': 1.0}
mix_l = drums.l * levels['drums'] + bass.l * levels['bass'] + keys.l * levels['keys'] + pads.l * levels['pads'] + sfx.l * levels['sfx'] + voice.l * levels['voice'] + wet_l
mix_r = drums.r * levels['drums'] + bass.r * levels['bass'] + keys.r * levels['keys'] + pads.r * levels['pads'] + sfx.r * levels['sfx'] + voice.r * levels['voice'] + wet_r

# Égalisation légère : on retire l'extrême grave inaudible, saturation douce, puis niveau final à -1 dB.
mix = np.stack([hp(mix_l, 32), hp(mix_r, 32)])
# Présence pour les haut-parleurs de téléphone : un peu moins d'extrême grave, un peu plus d'aigu.
mix = mix - 0.35 * np.stack([lp(mix[0], 70), lp(mix[1], 70)]) + 0.8 * np.stack([hp(mix[0], 3200), hp(mix[1], 3200)])
mix = np.tanh(mix * 1.15) / np.tanh(1.15)
total = int(DUR * SR)
mix = mix[:, :total]
fade_in = np.minimum(1, np.arange(total) / (0.03 * SR))
fade_out = np.clip((total - np.arange(total)) / (0.45 * SR), 0, 1)
mix *= fade_in * fade_out
mix /= np.max(np.abs(mix)) / 10 ** (-1 / 20)
wavfile.write(sys.argv[2], SR, (mix.T * 32767).astype(np.int16))
print(f'bande-son écrite : {sys.argv[2]} ({total / SR:.1f} s, {len(cues)} effets)')
