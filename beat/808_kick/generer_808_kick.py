import sys,os,numpy as np,soundfile as sf,mido
from scipy.signal import butter,sosfilt
OUT=sys.argv[1];BPM=147;SR=44100;TPB=480;beat=60/BPM;BARS=16;rng=np.random.default_rng(11)
f=lambda n:440*2**((n-69)/12)
roots=[35,31,28,30]   # B1, G1, E1, F#1  (Bm – G – Em – F#, 2 mesures chacun)
# 2-bar patterns (beats, length, offset in semitones from root)
A=[(0,1.5,0),(1.75,0.75,0),(2.5,0.5,0),(3,1,0),(4,2,0),(6.75,0.5,0),(7.5,0.5,12)]          # octave slide at end
B=[(0,0.75,0),(0.75,0.75,0),(1.75,1.25,0),(3,1,7),(4,1.5,0),(5.75,0.75,0),(6.5,0.5,-2),(7,1,0)]
K_A=[0,1.75,2.5,4,4.75,7.25];K_B=[0,0.75,1.75,3,4,5.75,6.5,7]
bass=[];kick=[]
for g in range(BARS//2):
  r=roots[g%4];t0=g*8;pa,pk=(A,K_A) if (g//4)%2==0 else (B,K_B)
  if g==BARS//2-1: pa=pa[:-2]+[(6.5,1.5,0)];pk=[k for k in pk if k<6.5]   # fin de boucle: respiration
  for t,d,o in pa: bass.append((t0+t,r+o,d,110))
  for t in pk: kick.append((t0+t,36,0.25,120))
# MIDI
mf=mido.MidiFile(ticks_per_beat=TPB);meta=mido.MidiTrack();mf.tracks.append(meta)
meta+=[mido.MetaMessage('set_tempo',tempo=mido.bpm2tempo(BPM)),mido.MetaMessage('key_signature',key='Bm'),mido.MetaMessage('track_name',name='808_KICK_147_Bm')]
for name,lst,ch,pg in(('808',bass,0,38),('kick',kick,9,0)):
  tr=mido.MidiTrack();tr.append(mido.MetaMessage('track_name',name=name))
  if ch!=9: tr.append(mido.Message('program_change',program=pg,channel=ch))
  ms=[]
  for t,n,d,v in lst: ms+=[(int(t*TPB),1,mido.Message('note_on',note=n,velocity=v,channel=ch)),(int((t+d)*TPB),0,mido.Message('note_off',note=n,velocity=0,channel=ch))]
  ms.sort(key=lambda m:(m[0],m[1]));last=0
  for tk,_,m in ms: m.time=tk-last;last=tk;tr.append(m)
  mf.tracks.append(tr)
mf.save(f'{OUT}/808_KICK_147BPM_Bm.mid')
# audio
N=int(BARS*4*beat*SR)
fr=np.full(N,f(35));amp=np.zeros(N);ev=sorted(bass)
for i,(t,n,d,v) in enumerate(ev):
  a=int(t*beat*SR);b=min(N,a+int(d*beat*SR));tt=np.arange(b-a)/SR;fc=np.full(b-a,f(n))
  if i+1<len(ev) and abs(ev[i+1][0]-(t+d))<1e-6 and ev[i+1][1]!=n:
    g=min(int(0.08*SR),b-a);fc[-g:]=np.geomspace(f(n),f(ev[i+1][1]),g)
  fr[a:b]=fc;e=np.exp(-tt*0.6)*v/127;at=int(0.002*SR);e[:at]*=np.linspace(0,1,at);rl=int(0.03*SR);e[-rl:]*=np.linspace(1,0,rl);amp[a:b]=e
ph=2*np.pi*np.cumsum(fr)/SR;b808=(np.tanh(2.8*np.sin(ph))*0.8+0.2*np.sin(ph))*amp
b808=sosfilt(butter(2,30,'high',fs=SR,output='sos'),b808)
kk=np.zeros(N)
for t,*_ in kick:
  L=int(0.28*SR);tt=np.arange(L)/SR;s=np.sin(2*np.pi*np.cumsum(48+190*np.exp(-tt*40))/SR)*np.exp(-tt*14);s+=sosfilt(butter(2,3000,'high',fs=SR,output='sos'),rng.standard_normal(L))*np.exp(-tt*400)*0.5
  a=int(t*beat*SR);kk[a:a+L]+=s[:N-a]
# sidechain: duck 808 under kick
du=np.ones(N)
for t,*_ in kick:
  a=int(t*beat*SR);L=int(0.09*SR);du[a:a+L]=np.minimum(du[a:a+L],(1-0.6*np.exp(-np.arange(L)/SR*35))[:N-a])
b808*=du
sc=0.8/max(np.abs(b808).max(),np.abs(kk).max(),np.abs(b808*0.85+kk).max())
st=lambda x:np.stack([x,x],1).astype('float32')
sf.write(f'{OUT}/808_seul.wav',st(b808*0.85*sc),SR,subtype='PCM_24');sf.write(f'{OUT}/kick_seul.wav',st(kk*sc),SR,subtype='PCM_24')
sf.write(f'{OUT}/808_kick.wav',st((b808*0.85+kk)*sc),SR,subtype='PCM_24')
print('ok',round(N/SR,1),'s',len(bass),'notes 808',len(kick),'kicks')
