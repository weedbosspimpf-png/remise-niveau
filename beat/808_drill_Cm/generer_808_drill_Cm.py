import sys,numpy as np,soundfile as sf,mido
from scipy.signal import butter,sosfilt
OUT=sys.argv[1];BPM=float(sys.argv[2]);SR=44100;TPB=480;st=60/BPM/4;BARS=16
f=lambda n:440*2**((n-69)/12)
# Cm | Cm | Ab | G   (1 mesure chacun, en 16e) – racines graves
ROOT=[36,36,32,31]
P1=[(0,7,0),(7,3,12),(10,6,0)]                     # pose + slide à l'octave
P2=[(0,6,0),(6,2,7),(8,4,0),(12,4,12)]             # rebond quinte / octave
P3=[(0,5,0),(5,2,1),(7,3,0),(10,3,-2),(13,3,0)]    # Réb phrygien (couleur drill sombre)
ev=[]
for b in range(BARS):
  r=ROOT[b%4];t0=b*16
  pat=P3 if (b%4==0 and b%8==4) else (P1 if b%2==0 else P2)
  if b==BARS-1: pat=[(0,8,0),(8,8,-12+12)]          # fin de boucle tenue
  for s,d,o in pat: ev.append((t0+s,r+o,d))
mf=mido.MidiFile(ticks_per_beat=TPB);tr=mido.MidiTrack();mf.tracks.append(tr)
tr+=[mido.MetaMessage('set_tempo',tempo=mido.bpm2tempo(BPM)),mido.MetaMessage('key_signature',key='Cm'),mido.MetaMessage('track_name',name='808 drill Cm'),mido.Message('program_change',program=38,channel=0)]
ms=[]
for s,n,d in ev: ms+=[(s*TPB//4,1,mido.Message('note_on',note=n,velocity=110,channel=0)),((s+d)*TPB//4,0,mido.Message('note_off',note=n,velocity=0,channel=0))]
ms.sort(key=lambda m:(m[0],m[1]));lt=0
for tk,_,m in ms: m.time=tk-lt;lt=tk;tr.append(m)
mf.save(f'{OUT}/808_DRILL_Cm_{int(BPM)}BPM.mid')
N=int(BARS*16*st*SR)+int(0.3*SR);fr=np.full(N,f(36));amp=np.zeros(N)
for j,(s,n,d) in enumerate(ev):
  a=int(s*st*SR);b=min(N,a+int(d*st*SR));tt=np.arange(b-a)/SR;fc=np.full(b-a,f(n))
  if j+1<len(ev) and ev[j+1][0]==s+d and ev[j+1][1]!=n:
    g=min(int(0.11*SR),b-a);fc[-g:]=np.geomspace(f(n),f(ev[j+1][1]),g)
  fr[a:b]=fc;e=np.exp(-tt*0.45);e[:90]*=np.linspace(0,1,90);e[-700:]*=np.linspace(1,0,700);amp[a:b]=e
ph=2*np.pi*np.cumsum(fr)/SR
x=(np.tanh(3.0*np.sin(ph))*0.7+0.3*np.sin(ph))*amp
x=sosfilt(butter(2,28,'high',fs=SR,output='sos'),x)
x=np.stack([x,x],1)*0.8/np.abs(x).max();sf.write(f'{OUT}/808_DRILL_Cm_{int(BPM)}BPM.wav',x.astype('float32'),SR,subtype='PCM_24')
names='C Db D Eb E F Gb G Ab A Bb B'.split()
for s,n,d in ev[:16]: print(f'mes {s//16+1} pas {s%16+1:2d}  {names[n%12]}{n//12-1}  {d} doubles-croches')
