import sys,numpy as np,soundfile as sf,mido
from scipy.signal import butter,sosfilt
D=sys.argv[1];BPM=147;SR=44100;TPB=480;beat=60/BPM;BARS=16;rng=np.random.default_rng(21)
hats=[];oh=[];clap=[]
for b in range(BARS):
  t0=b*4;g=b//2
  last=(b==BARS-1)
  clap.append((t0+2,39,0.25,118))
  if b%4==3 and not last: clap.append((t0+3.75,39,0.2,80))     # petit clap fantôme
  for k in range(8):                 # base: croches, accent sur le temps
    t=t0+k*0.5
    if b%4==1 and k==6:              # roll double-croche
      for j in range(4): hats.append((t+j*0.125,42,0.05,72+8*j))
    elif b%4==3 and k==5:            # roll triolet (6 coups / 2 croches)
      for j in range(6): hats.append((t+j/6,42,0.05,60+8*j))
    elif b%4==3 and k==6: pass
    elif b%8==7 and k==7:            # roll triple-croche montant
      for j in range(8): hats.append((t+j*0.0625,42,0.04,55+8*j))
    else: hats.append((t,42,0.1,100 if k%2==0 else 72))
  if b%4==1: oh.append((t0+3.5,46,0.5,85))
  if last: hats=[h for h in hats if h[0]<t0+3]
# MIDI: add to existing file
mf=mido.MidiFile(f'{D}/808_KICK_147BPM_Bm.mid')
for name,lst in(('hats',hats),('openhat',oh),('clap',clap)):
  tr=mido.MidiTrack();tr.append(mido.MetaMessage('track_name',name=name));ms=[]
  for t,n,d,v in lst: ms+=[(int(t*TPB),1,mido.Message('note_on',note=n,velocity=v,channel=9)),(int((t+d)*TPB),0,mido.Message('note_off',note=n,velocity=0,channel=9))]
  ms.sort(key=lambda m:(m[0],m[1]));last=0
  for tk,_,m in ms: m.time=tk-last;last=tk;tr.append(m)
  mf.tracks.append(tr)
mf.save(f'{D}/DRUMS_808_147BPM_Bm.mid')
N=int(BARS*4*beat*SR);H=np.zeros((N,2));C=np.zeros((N,2))
hp=lambda x,fc:sosfilt(butter(4,fc,'high',fs=SR,output='sos'),x)
def put(A,t,s,pl,pr):
  a=int(t*beat*SR);e=min(N,a+len(s));A[a:e,0]+=s[:e-a]*pl;A[a:e,1]+=s[:e-a]*pr
for t,n,d,v in hats:
  L=int(0.12*SR);tt=np.arange(L)/SR;s=hp(rng.standard_normal(L),7800)*np.exp(-tt*(70 if d>0.06 else 110))*v/127*0.32;put(H,t,s,0.85,1.0)
for t,n,d,v in oh:
  L=int(0.5*SR);tt=np.arange(L)/SR;s=hp(rng.standard_normal(L),6500)*np.exp(-tt*7)*v/127*0.22;put(H,t,s,1.0,0.85)
for t,n,d,v in clap:
  L=int(0.45*SR);tt=np.arange(L)/SR;nz=sosfilt(butter(2,[800,9000],'band',fs=SR,output='sos'),rng.standard_normal(L))
  s=nz*np.exp(-tt*11)*0.8+np.sin(2*np.pi*200*tt)*np.exp(-tt*35)*0.25
  for dl,a in((0,1),(0.010,0.8),(0.021,0.9)): put(C,t+dl/beat,s*a*v/127*0.42,1,1)
# light room on clap
ir=rng.standard_normal(int(0.6*SR))*np.exp(-np.arange(int(0.6*SR))/SR*9);ir=sosfilt(butter(2,[500,6000],'band',fs=SR,output='sos'),ir);ir/=np.sqrt((ir**2).sum())
from scipy.signal import fftconvolve
C+=np.stack([fftconvolve(C[:,0],ir)[:N],fftconvolve(C[:,1],np.roll(ir,97))[:N]],1)*0.18
b8,_=sf.read(f'{D}/808_seul.wav');kk,_=sf.read(f'{D}/kick_seul.wav')
full=b8[:N]+kk[:N]+H+C;sc=0.85/np.abs(full).max()
for name,x in(('hats_seuls',H),('clap_seul',C),('drums_808_complet',full)): sf.write(f'{D}/{name}.wav',(x*sc).astype('float32'),SR,subtype='PCM_24')
print('hats',len(hats),'open',len(oh),'claps',len(clap))
