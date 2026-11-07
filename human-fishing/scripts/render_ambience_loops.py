#!/usr/bin/env python3
"""Original seamless ambience for the 12 Human Fishing areas + diver underwater.
No copyrighted audio sources. All loops are rendered offline, bundled as OGG.
"""
from pathlib import Path
import subprocess, tempfile, wave
import numpy as np

SR=22050
D=11.0
N=int(SR*D)
T=np.arange(N,dtype=np.float64)/SR
OUT=Path(__file__).resolve().parents[1]/'assets'/'ambience'
FREQ=np.fft.rfftfreq(N,1/SR)

def band(rng,low,high,slope=1):
    data=rng.normal(0,1,N)
    spectrum=np.fft.rfft(data)
    hi=1-np.exp(-(FREQ/max(1,low))**2) if low else 1
    lo=np.exp(-(FREQ/max(10,high))**(2*slope))
    y=np.fft.irfft(spectrum*hi*lo,n=N)
    return y/max(.001,np.sqrt(np.mean(y*y)))

def cyc(k,phase=0):
    return np.sin(2*np.pi*k*T/D+phase)

def swell(k,phase=0):
    return np.maximum(0,cyc(k,phase))**1.8

def ripple(rng):
    smooth=band(rng,15,650)
    hiss=band(rng,230,2300)
    return .56*smooth*(.6+.35*swell(4,.1))+.21*hiss*(.24+.6*swell(4,1))

def leaves(rng):
    return band(rng,250,3900)*(.13+.38*swell(7,.2))

def breeze(rng):
    return band(rng,20,930)*(.31+.19*cyc(3,.1)+.12*cyc(5,.8))

def calls(buf,rng,count,kind,volume):
    """Sparse pitch-bent bird, insect, frog, gull and ice calls."""
    for _ in range(count):
        center=rng.uniform(.1,D-.1)
        length=rng.uniform(.085,.24) if kind in ('bird','gull') else rng.uniform(.16,.4)
        n=max(24,int(SR*length))
        p=np.linspace(0,1,n,endpoint=False)
        env=np.sin(np.pi*p)**2
        env*=.55+.45*np.sin(2*np.pi*p*rng.uniform(2,5))**2
        if kind=='bird':
            base=rng.uniform(1350,2600)
            sweep=rng.uniform(-.35,.43)
            hz=base*(1+sweep*(p-.5)+.10*np.sin(p*2*np.pi*rng.choice([2,3])))
        elif kind=='gull':
            base=rng.uniform(610,940)
            hz=base*(1+.28*np.sin(2*np.pi*p)+.1*p)
        elif kind=='frog':
            base=rng.uniform(180,360)
            hz=base*(1-.25*p+.05*np.sin(2*np.pi*p*8))
        elif kind=='ice':
            base=rng.uniform(155,330)
            hz=base*(1-.18*p)
        else:
            base=rng.uniform(2500,4700)
            hz=base*(1+.04*np.sin(2*np.pi*11*p))
            env*=.55+.45*np.sin(2*np.pi*13*p)**2
        phase=2*np.pi*np.cumsum(hz)/SR
        tone=np.sin(phase)+(np.sin(phase*2.03)*.26 if kind=='frog' else 0)
        segment=volume*env*tone
        start=int(center*SR)-n//2
        # Wrap each natural call so the background loop has no clipping.
        np.add.at(buf,(start+np.arange(n))%N,segment)

RECIPES=[
 ('freshwater_planted',.40,.13,.24,9,5,2,0,0),
 ('amazon',.28,.12,.40,18,12,4,0,0),
 ('african_lake',.48,.32,.14,6,15,0,0,0),
 ('asian_wetland',.32,.18,.26,10,10,13,0,0),
 ('alpine_lake',.39,.45,.09,4,1,0,0,0),
 ('east_asia',.41,.22,.18,13,3,2,0,0),
 ('tropical',.62,.32,.20,5,4,0,7,0),
 ('seagrass',.48,.23,.15,4,3,0,5,0),
 ('harbor',.54,.26,.06,0,0,0,8,0),
 ('open_ocean',.72,.52,.02,0,0,0,10,0),
 ('moonlight',.23,.12,.19,2,17,9,0,0),
 ('polar_ice',.19,.73,.01,0,0,0,0,7)
]

def theme(zone):
    rng=np.random.default_rng(50421+zone*2917)
    name,w,v,l,birds,insects,frogs,gulls,ice=RECIPES[zone]
    motion=.66+.25*cyc(3,.22)+.13*cyc(4,.83)
    sound=ripple(rng)*w*motion+breeze(rng)*v+leaves(rng)*l
    if name=='harbor':
        sound+=.13*band(rng,80,310)*swell(2,1.1)
    if name=='polar_ice':
        sound+=.18*band(rng,55,270)*swell(3,.8)
    if name=='moonlight':
        sound*=.80
    if name=='open_ocean':
        sound+=.14*band(rng,90,1100)*swell(5,.24)
    calls(sound,rng,birds,'bird',.14)
    calls(sound,rng,insects,'cricket',.065)
    calls(sound,rng,frogs,'frog',.10)
    calls(sound,rng,gulls,'gull',.12)
    calls(sound,rng,ice,'ice',.13)
    return name,sound

def underwater():
    rng=np.random.default_rng(308060)
    # The diver sound: strong underwater lowpass, slow pressure swell and
    # little rising air bubbles. Surface wildlife completely disappears.
    pressure=band(rng,13,150)*(.19+.10*cyc(2,.9))
    liquid=band(rng,40,440)*(.31+.12*cyc(3,.15))
    hollow=band(rng,140,700)*(.10+.07*swell(5,.8))
    sound=pressure+liquid+hollow
    for _ in range(18):
        center=rng.uniform(.1,D-.1)
        length=rng.uniform(.07,.27)
        n=max(20,int(SR*length))
        p=np.linspace(0,1,n,endpoint=False)
        hz=rng.uniform(145,400)*(1+1.08*p)
        phase=2*np.pi*np.cumsum(hz)/SR
        bubble=.075*np.sin(np.pi*p)**2*(np.sin(phase)+.22*np.sin(phase*1.96))
        start=int(center*SR)-n//2
        np.add.at(sound,(start+np.arange(n))%N,bubble)
    return 'underwater',sound

def to_ogg(name,source):
    # Crossfade the loop seam to guarantee no hard digital click.
    fade=int(SR*.15)
    data=np.array(source,dtype=np.float64,copy=True)
    orig=data.copy()
    w=np.linspace(0,1,fade,endpoint=True)
    data[-fade:]=orig[-fade:]*(1-w)+orig[:fade]*w
    data=np.tanh(data*(.73/max(.001,np.max(np.abs(data))))*1.12).astype(np.float32)
    pcm=np.asarray(np.clip(data*32766,-32767,32767),dtype=np.int16)
    OUT.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory() as temp:
        wav=Path(temp)/'ambient.wav'
        with wave.open(str(wav),'wb') as target:
            target.setnchannels(1)
            target.setsampwidth(2)
            target.setframerate(SR)
            target.writeframes(pcm.tobytes())
        path=OUT/(name+'.ogg')
        subprocess.run(['ffmpeg','-hide_banner','-loglevel','error',
                        '-y','-i',str(wav),'-c:a','libvorbis',
                        '-qscale:a','2',str(path)],check=True)
    assert path.stat().st_size>4500 and path.read_bytes()[:4]==b'OggS'
    print('PASS',name,path.stat().st_size)

def main():
    for index in range(12):
        to_ogg(*theme(index))
    to_ogg(*underwater())
    print('PASS: 12 distinct surface environments and 1 common muffled diver loop')

if __name__=='__main__':
    main()
