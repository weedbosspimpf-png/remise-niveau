import sys,numpy as np,soundfile as sf,mido
from scipy.signal import butter,sosfilt
OUT=sys.argv[1];BPM=147;SR=44100;TPB=480
beat=60/BPM;bar=4*beat;BARS=16
# Bm – G – Em – F#  (2 bars each), loop x2 over 16 bars
prog=[('Bm',[59,62,66],47),('G',[59,62,67],43),('Em',[59,64,67],40),('F#',[58,61,66],42)]
def chord_at(b): return prog[(b//2)%4]
# ---------- events (in beats) ----------
ev={k:[] for k in['accords','melodie','808','kick','snare','hats','openhat']}
mel=[(0,71,1.5),(1.5,74,0.5),(2,73,1),(3,71,1),(4,69,1.5),(5.5,71,0.5),(6,66,2)]  # 2-bar motif in B minor
intro=4
for b in range(BARS):
  name,notes,root=chord_at(b);t0=b*4
  if b%2==0:
    for n in notes: ev['accords'].append((t0,n,8,70))
  if b%2==0:
    for t,n,d in mel:
      nn=n+1 if (name=="F#" and n==69) else n   # A->A# (Si mineur harmonique)
      ev['melodie'].append((t0+t,nn,d,85))
  if b<intro: continue
  # 808 pattern (per bar)
  pat=[(0,1.5),(1.75,0.75),(2.5,0.5),(3,1)] if b%2==0 else [(0,2),(2.75,0.5),(3.5,0.5)]
  for t,d in pat: ev['808'].append((t0+t,root-12 if root>=47 else root-12,d,110))
  for t in([0,1.75,2.5] if b%2==0 else [0,0.75,3.25]): ev['kick'].append((t0+t,36,0.25,120))
  ev['snare'].append((t0+2,39,0.25,115))
  # hats: 1/8 with rolls
  for i in range(8):
    t=t0+i*0.5
    if b%4==3 and i==6:
      for j in range(6): ev['hats'].append((t+j/6*0.5*2/2,42,0.05,70+5*j))   # triplet roll
    elif b%2==1 and i==7:
      for j in range(4): ev['hats'].append((t+j*0.125,42,0.05,80))
    else: ev['hats'].append((t,42,0.1,95 if i%2==0 else 70))
  if b%4==1: ev['openhat'].append((t0+3.5,46,0.5,80))
# ---------- MIDI ----------
mf=mido.MidiFile(ticks_per_beat=TPB);meta=mido.MidiTrack();mf.tracks.append(meta)
meta.append(mido.MetaMessage('set_tempo',tempo=mido.bpm2tempo(BPM)));meta.append(mido.MetaMessage('key_signature',key='Bm'));meta.append(mido.MetaMessage('track_name',name='BEAT_147_Bm'))
progs={'accords':(0,89),'melodie':(1,11),'808':(2,38),'kick':(9,0),'snare':(9,0),'hats':(9,0),'openhat':(9,0)}
for k,lst in ev.items():
  ch,pg=progs[k];tr=mido.MidiTrack();tr.append(mido.MetaMessage('track_name',name=k))
  if ch!=9: tr.append(mido.Message('program_change',program=pg,channel=ch))
  msgs=[]
  for t,n,d,v in lst: msgs+=[(int(t*TPB),1,mido.Message('note_on',note=n,velocity=v,channel=ch)),(int((t+d)*TPB),0,mido.Message('note_off',note=n,velocity=0,channel=ch))]
  msgs.sort(key=lambda m:(m[0],m[1]));last=0
  for tk,_,m in msgs: m.time=tk-last;last=tk;tr.append(m)
  mf.tracks.append(tr)
mf.save(f'{OUT}/BEAT_147BPM_Bm.mid')
# ---------- audio preview ----------
N=int(BARS*bar*SR)+SR*2;mix={k:np.zeros(N) for k in ev}
f=lambda n:440*2**((n-69)/12)
def env(n,a,r,sus=None):
  e=np.ones(n);ai=max(1,int(a*SR));e[:ai]=np.linspace(0,1,ai);ri=min(n,int(r*SR));e[-ri:]*=np.linspace(1,0,ri);return e
rng=np.random.default_rng(3)
for t,n,d,v in ev['accords']:
  L=int((d*beat+0.6)*SR);tt=np.arange(L)/SR;s=np.zeros(L)
  for det in(-0.08,0,0.08):
    ph=(tt*f(n+det))%1;s+=2*ph-1
  s=sosfilt(butter(2,1400,'low',fs=SR,output='sos'),s)*env(L,0.4,1.0)*v/127*0.06
  i=int(t*beat*SR);mix['accords'][i:i+L]+=s[:N-i]
for t,n,d,v in ev['melodie']:
  L=int((d*beat+0.8)*SR);tt=np.arange(L)/SR
  s=np.sin(2*np.pi*f(n)*tt+1.5*np.exp(-tt*6)*np.sin(2*np.pi*f(n)*3.5*tt))*np.exp(-tt*2.2)*env(L,0.005,0.3)*v/127*0.18
  i=int(t*beat*SR);mix['melodie'][i:i+L]+=s[:N-i]
for t,n,d,v in ev['808']:
  L=int((d*beat+0.15)*SR);tt=np.arange(L)/SR;fr=f(n)*(1+1.5*np.exp(-tt*40))
  s=np.tanh(2.2*np.sin(2*np.pi*np.cumsum(fr)/SR))*env(L,0.003,0.12)*v/127*0.42
  i=int(t*beat*SR);mix['808'][i:i+L]+=s[:N-i]
for t,n,d,v in ev['kick']:
  L=int(0.3*SR);tt=np.arange(L)/SR;fr=50+160*np.exp(-tt*35)
  s=np.sin(2*np.pi*np.cumsum(fr)/SR)*np.exp(-tt*12)+0.3*rng.standard_normal(L)*np.exp(-tt*300);s*=v/127*0.55
  i=int(t*beat*SR);mix['kick'][i:i+L]+=s
for t,n,d,v in ev['snare']:
  L=int(0.35*SR);tt=np.arange(L)/SR;nz=sosfilt(butter(2,[900,9000],'band',fs=SR,output='sos'),rng.standard_normal(L))
  s=(nz*np.exp(-tt*14)*0.9+np.sin(2*np.pi*190*tt)*np.exp(-tt*30)*0.4)
  for dl in(0,0.011,0.023): j=int(dl*SR);mix['snare'][int(t*beat*SR)+j:int(t*beat*SR)+j+L]+=s*v/127*0.3
for k,dec in(('hats',70),('openhat',9)):
  for t,n,d,v in ev[k]:
    L=int(0.4*SR);tt=np.arange(L)/SR;s=sosfilt(butter(4,7000,'high',fs=SR,output='sos'),rng.standard_normal(L))*np.exp(-tt*dec)*v/127*0.12
    i=int(t*beat*SR);mix[k][i:i+L]+=s
# stereo placement & sum
pan={'accords':(0.85,1.0),'melodie':(1.0,0.75),'808':(1,1),'kick':(1,1),'snare':(1,1),'hats':(0.8,1.0),'openhat':(1.0,0.8)}
out=np.zeros((N,2))
for k,s in mix.items(): out[:,0]+=s*pan[k][0];out[:,1]+=s*pan[k][1]
out/=np.abs(out).max()/0.7
sf.write(f'{OUT}/preview_raw.wav',out.astype('float32'),SR)
print('ok', {k:len(v) for k,v in ev.items()})
