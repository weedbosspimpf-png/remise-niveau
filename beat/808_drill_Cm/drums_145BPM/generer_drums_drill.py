import sys,numpy as np,soundfile as sf,mido
from scipy.signal import butter,sosfilt,fftconvolve
D=sys.argv[1];BPM=145;SR=44100;TPB=480;st=60/BPM/4;BARS=16;rng=np.random.default_rng(145)
m8=mido.MidiFile(f'{D}/808_DRILL_Cm_145BPM.mid');t=0;starts=[]
for m in m8.tracks[0]:
  t+=m.time
  if m.type=='note_on' and m.velocity>0: starts.append(t*4//TPB)
K=[];SN=[];H=[]
for b in range(BARS):
  t0=b*16;s8=[s-t0 for s in starts if t0<=s<t0+16]
  for s in s8:
    if s in(0,7,10,13) or (s==8 and b%2==1): K.append((t0+s,120 if s==0 else 105))   # kick suit la 808
  SN.append((t0+8,120))
  if b%2==1: SN.append((t0+14,100))            # rebond drill
  if b%4==2: SN.append((t0+11,55))             # ghost
  if b%8==7: SN+= [(t0+13,80),(t0+15,95)]      # petit fill
  base=[0,3,6,8,11,14] if b%2==0 else [0,2,3,6,8,11,12,14]
  for s in base:
    if b%4==3 and s>=12: continue
    H.append((t0+s,100 if s in(0,8) else 75))
  if b%4==3:                                    # roulement triolet sur le dernier temps
    for j in range(6): H.append((t0+12+j*4/6,70+6*j))
  if b%8==5:                                    # stutter 32e
    for j in range(4): H.append((t0+4+j*0.5,65+8*j))
  if b==BARS-1: H=[h for h in H if h[0]<t0+12]
# MIDI : 808 + drums
mf=mido.MidiFile(ticks_per_beat=TPB);mf.tracks.append(m8.tracks[0])
for name,lst,note in(('kick',K,36),('snare',SN,38),('hats',H,42)):
  tr=mido.MidiTrack();tr.append(mido.MetaMessage('track_name',name=name));ms=[]
  for s,v in lst: ms+=[(int(s*TPB/4),1,mido.Message('note_on',note=note,velocity=v,channel=9)),(int((s+0.5)*TPB/4),0,mido.Message('note_off',note=note,velocity=0,channel=9))]
  ms.sort(key=lambda m:(m[0],m[1]));lt=0
  for tk,_,m in ms: m.time=tk-lt;lt=tk;tr.append(m)
  mf.tracks.append(tr)
mf.save(f'{D}/DRILL_Cm_145BPM_808_DRUMS.mid')
b8,_=sf.read(f'{D}/808_DRILL_Cm_145BPM.wav');N=len(b8)
hp=lambda x,fc,o=2:sosfilt(butter(o,fc,'high',fs=SR,output='sos'),x)
Kx=np.zeros(N);Sx=np.zeros(N);Hx=np.zeros((N,2))
def put(A,s,x):
  a=int(s*st*SR);e=min(N,a+len(x))
  if a<N: A[a:e]+=x[:e-a]
for s,v in K:
  L=int(0.22*SR);tt=np.arange(L)/SR;x=np.sin(2*np.pi*np.cumsum(58+220*np.exp(-tt*50))/SR)*np.exp(-tt*18)+hp(rng.standard_normal(L),3500)*np.exp(-tt*600)*0.7
  put(Kx,s,np.tanh(1.3*x)*v/127)
for s,v in SN:
  L=int(0.3*SR);tt=np.arange(L)/SR;body=np.sin(2*np.pi*np.cumsum(270+90*np.exp(-tt*70))/SR)*np.exp(-tt*32)*0.5
  w=sosfilt(butter(2,[3000,12500],'band',fs=SR,output='sos'),rng.standard_normal(L))*np.exp(-tt*19)*0.85;put(Sx,s,np.tanh(1.9*(body+w))*v/127)
for s,v in H:
  L=int(0.07*SR);tt=np.arange(L)/SR;x=hp(rng.standard_normal(L),8500,4)*np.exp(-tt*95)*v/127
  a=int(s*st*SR);e=min(N,a+L);pl=0.85+0.15*np.sin(s)
  if a<N: Hx[a:e,0]+=x[:e-a]*pl;Hx[a:e,1]+=x[:e-a]*(1.7-pl)
ir=rng.standard_normal(int(0.7*SR))*np.exp(-np.arange(int(0.7*SR))/SR*8);ir=sosfilt(butter(2,[400,7000],'band',fs=SR,output='sos'),ir);ir/=np.sqrt((ir**2).sum())
S2=np.stack([Sx+fftconvolve(Sx,ir)[:N]*0.18,Sx+fftconvolve(Sx,np.roll(ir,111))[:N]*0.18],1)
K2=np.stack([Kx,Kx],1)
# niveaux relatifs
K2*=0.55/np.abs(K2).max();S2*=0.42/np.abs(S2).max();Hx*=0.16/np.abs(Hx).max()
# sidechain du kick sur la 808
du=np.ones(N)
for s,v in K:
  a=int(s*st*SR);L=int(0.08*SR);du[a:a+L]=np.minimum(du[a:a+L],(1-0.55*np.exp(-np.arange(L)/SR*40))[:N-a])
b8=b8*du[:,None]*0.55/np.abs(b8).max()
drums=K2+S2+Hx;full=drums+b8
out={'kick_seul':K2,'snare_seule':S2,'hats_seuls':Hx,'drums_complet':drums,'drill_808_drums':full}
for k,x in out.items(): sf.write(f'{D}/{k}.wav',(x*0.85/np.abs(x).max()).astype('float32'),SR,subtype='PCM_24')
print('kicks',len(K),'snares',len(SN),'hats',len(H))
