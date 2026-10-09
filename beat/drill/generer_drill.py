import sys,os,numpy as np,soundfile as sf,mido
from scipy.signal import butter,sosfilt,fftconvolve
OUT=sys.argv[1];BPM=147;SR=44100;TPB=480;beat=60/BPM;st16=beat/4;rng=np.random.default_rng(77)
f=lambda n:440*2**((n-69)/12)
SECT=[('intro',8),('refrain',16),('couplet',16),('refrain',16),('couplet',8),('pont',8),('refrain',16),('outro',8)]
bars=[(s,i,n) for s,n in SECT for i in range(n)];NB=len(bars);N=int((NB*4*beat+4)*SR)
# Bm | Bm | G | F#   (1 mesure chacun) – progression drill sombre
CH=[('Bm',[59,62,66],35),('Bm',[59,62,66],35),('G',[59,62,67],31),('F#',[58,61,66],30)]
E={k:[] for k in['piano','choeur','cloche','808','kick','snare','hats','perc']};FX=[]
# riff piano (16e) sur 2 mesures, phrygien (Do) + harmonique (La#)
riffA=[(0,71,3),(3,72,1),(4,71,2),(6,66,2),(8,74,3),(11,73,1),(12,71,4),(16,71,3),(19,72,1),(20,74,2),(22,73,2),(24,70,4),(28,66,4)]
riffG=[(0,71,3),(3,72,1),(4,71,2),(6,67,2),(8,74,3),(11,72,1),(12,71,4),(16,70,3),(19,73,1),(20,78,4),(24,76,2),(26,73,2),(28,70,4)]
cloche=[(0,83,2),(2,84,2),(4,83,4),(8,78,4),(12,79,2),(14,78,2)]
HAT_A=[0,3,6,8,11,14];HAT_B=[0,2,3,6,8,10,11,14]
for b,(sec,i,n) in enumerate(bars):
  name,notes,root=CH[b%4];t0=b*16;last=i==n-1;full=sec in('refrain','couplet') or (sec=='pont' and i>=4)
  if b%2==0 and sec!='outro' or (sec=='outro' and i<4 and b%2==0):
    riff=riffA if b%4==0 else riffG
    for s,nn,d in riff: E['piano'].append((t0+s,nn-(12 if sec=='couplet' else 0),d,85 if sec!='couplet' else 75))
  for nn in notes: E['choeur'].append((t0,nn-12,16,55 if sec=='couplet' else 70))
  if sec=='refrain' and b%2==1:
    for s,nn,d in cloche: E['cloche'].append((t0+s,nn-(1 if name=='F#' and nn==84 else 0),d,70))
  if full and not (last and sec in('couplet','pont')):
    # 808 drill : glissés vers l'octave / la quinte
    pat=[(0,7,root),(7,3,root+12),(10,6,root)] if b%2==0 else [(0,6,root),(6,2,root+7),(8,4,root),(12,4,root+12)]
    for s,d,nn in pat: E['808'].append((t0+s,nn,d,112))
    for s in([0,10] if b%2==0 else [0,7,12]): E['kick'].append((t0+s,36,1,120))
    E['snare'].append((t0+8,38,1,120))
    if b%2==1: E['snare'].append((t0+13,38,1,95))          # le rebond drill
    if b%4==3: E['snare'].append((t0+15,38,1,60))          # ghost
    hp=HAT_A if b%2==0 else HAT_B
    for s in hp: E['hats'].append((t0+s,42,1,100 if s in(0,8) else 78))
    if b%4==3:   # stutter en triolets sur le dernier temps
      for j in range(6): E['hats'].append((t0+12+j*4/6,42,1,70+6*j))
    if sec=='refrain' and b%2==1: E['perc'].append((t0+6,37,1,70))
  if last and sec in('intro','couplet','pont'): FX.append(('riser',t0))
  if i==0 and sec in('refrain','couplet') : FX.append(('impact',t0))
# MIDI
mf=mido.MidiFile(ticks_per_beat=TPB);meta=mido.MidiTrack();mf.tracks.append(meta)
meta+=[mido.MetaMessage('set_tempo',tempo=mido.bpm2tempo(BPM)),mido.MetaMessage('key_signature',key='Bm'),mido.MetaMessage('track_name',name='DRILL_SOMBRE_147_Bm')]
prev=0
for s,n in SECT: meta.append(mido.MetaMessage('marker',text=s,time=prev*4*TPB));prev=n
chs={'piano':(0,0),'choeur':(1,52),'cloche':(2,14),'808':(3,38),'kick':(9,0),'snare':(9,0),'hats':(9,0),'perc':(9,0)}
for k,l in E.items():
  c,pg=chs[k];tr=mido.MidiTrack();tr.append(mido.MetaMessage('track_name',name=k))
  if c!=9: tr.append(mido.Message('program_change',program=pg,channel=c))
  ms=[]
  for s,nn,d,v in l: ms+=[(int(s*TPB/4),1,mido.Message('note_on',note=nn,velocity=v,channel=c)),(int((s+d)*TPB/4),0,mido.Message('note_off',note=nn,velocity=0,channel=c))]
  ms.sort(key=lambda m:(m[0],m[1]));lt=0
  for tk,_,m in ms: m.time=tk-lt;lt=tk;tr.append(m)
  mf.tracks.append(tr)
mf.save(f'{OUT}/DRILL_SOMBRE_147BPM_Bm.mid')
# synthèse
T={k:np.zeros(N) for k in list(E)+['fx']}
def put(k,s16,x):
  a=int(s16*st16*SR);e=min(N,a+len(x));T[k][a:e]+=x[:e-a]
lp=lambda x,fc:sosfilt(butter(2,fc,'low',fs=SR,output='sos'),x);hp=lambda x,fc,o=2:sosfilt(butter(o,fc,'high',fs=SR,output='sos'),x)
for s,n,d,v in E['piano']:
  L=int((d*st16+1.2)*SR);tt=np.arange(L)/SR
  x=sum(np.sin(2*np.pi*f(n)*h*tt*(1+0.0003*h*h))*np.exp(-tt*(1.8+h*0.8))/h**1.2 for h in range(1,8));x[:80]*=np.linspace(0,1,80);put('piano',s,x*v/127*0.2)
for s,n,d,v in E['choeur']:
  L=int((d*st16+1.5)*SR);tt=np.arange(L)/SR
  x=sum(np.sin(2*np.pi*f(n)*(1+dt)*tt+0.6*np.sin(2*np.pi*5*tt)) for dt in(-0.004,0,0.004))
  x=lp(x+0.3*sum(np.sin(2*np.pi*f(n)*k*tt)/k for k in(2,3,4)),1800)*np.minimum(1,tt/0.6)*np.minimum(1,(L/SR-tt)/1.2);put('choeur',s,x*v/127*0.05)
for s,n,d,v in E['cloche']:
  L=int((d*st16+1.5)*SR);tt=np.arange(L)/SR;x=np.sin(2*np.pi*f(n)*tt+1.2*np.exp(-tt*4)*np.sin(2*np.pi*f(n)*3.5*tt))*np.exp(-tt*2);put('cloche',s,lp(x,6000)*v/127*0.1)
fr=np.full(N,f(35));amp=np.zeros(N);ev=sorted(E['808'])
for j,(s,n,d,v) in enumerate(ev):
  a=int(s*st16*SR);b=min(N,a+int(d*st16*SR));tt=np.arange(b-a)/SR;fc=np.full(b-a,f(n))
  if j+1<len(ev) and abs(ev[j+1][0]-(s+d))<1e-6 and ev[j+1][1]!=n:
    g=min(int(0.12*SR),b-a);fc[-g:]=np.geomspace(f(n),f(ev[j+1][1]),g)
  fr[a:b]=fc;e=np.exp(-tt*0.5)*v/127;e[:100]*=np.linspace(0,1,100);e[-800:]*=np.linspace(1,0,800);amp[a:b]=e
ph=2*np.pi*np.cumsum(fr)/SR;T['808']=hp((np.tanh(3.2*np.sin(ph))*0.75+0.25*np.sin(ph))*amp*0.5,28)
for s,*_ in E['kick']:
  L=int(0.25*SR);tt=np.arange(L)/SR;x=np.sin(2*np.pi*np.cumsum(55+200*np.exp(-tt*45))/SR)*np.exp(-tt*16)+hp(rng.standard_normal(L),3000)*np.exp(-tt*500)*0.6;put('kick',s,x*0.5)
for s,n,d,v in E['snare']:
  L=int(0.3*SR);tt=np.arange(L)/SR;body=np.sin(2*np.pi*np.cumsum(260+80*np.exp(-tt*70))/SR)*np.exp(-tt*30)*0.5
  w=sosfilt(butter(2,[3000,12000],'band',fs=SR,output='sos'),rng.standard_normal(L))*np.exp(-tt*20)*0.8;put('snare',s,np.tanh(1.8*(body+w))*v/127*0.42)
for s,n,d,v in E['hats']:
  L=int(0.08*SR);tt=np.arange(L)/SR;put('hats',s,hp(rng.standard_normal(L),8000,4)*np.exp(-tt*90)*v/127*0.13)
for s,n,d,v in E['perc']:
  L=int(0.2*SR);tt=np.arange(L)/SR;put('perc',s,np.sin(2*np.pi*560*tt)*np.exp(-tt*25)*v/127*0.2)
for typ,s in FX:
  if typ=='riser':
    L=int(4*beat*SR);x=rng.standard_normal(L);o=np.zeros(L)
    for a in range(0,L,2048):
      fc=300+9000*(a/L)**2;o[a:a+2048]=sosfilt(butter(2,[fc,min(fc*1.6,20000)],'band',fs=SR,output='sos'),x[a:a+2048])
    put('fx',s,o*np.linspace(0,1,L)**2*0.3)
  else:
    L=int(2.5*SR);tt=np.arange(L)/SR;put('fx',s,np.sin(2*np.pi*np.cumsum(32+70*np.exp(-tt*9))/SR)*np.exp(-tt*2.2)*0.5+lp(rng.standard_normal(L),2500)*np.exp(-tt*5)*0.2)
# réverb sombre
L=int(2.8*SR);tt=np.arange(L)/SR;ir=rng.standard_normal((L,2))*np.exp(-tt*6.9/2.4)[:,None];ir=sosfilt(butter(2,[250,5000],'band',fs=SR,output='sos'),ir,axis=0);ir/=np.sqrt((ir**2).sum(0)).max()
send=T['piano']*0.35+T['cloche']*0.6+T['choeur']*0.4+T['snare']*0.12
rv=np.stack([fftconvolve(send,ir[:,c])[:N] for c in(0,1)],1)*0.8
ke=np.zeros(N)
for s,*_ in E['kick']:
  a=int(s*st16*SR);g=np.exp(-np.arange(int(0.2*SR))/SR*16);ke[a:a+len(g)]=np.maximum(ke[a:a+len(g)],g[:N-a])
pan={'piano':(1,0.85),'choeur':(0.85,1),'cloche':(0.7,1),'808':(1,1),'kick':(1,1),'snare':(1,1),'hats':(0.8,1),'perc':(1,0.6),'fx':(1,1)}
S2={}
for k,x in T.items():
  if k in('piano','choeur'): x=x*(1-0.35*ke)
  S2[k]=np.stack([x*pan[k][0],x*pan[k][1]],1)
S2['reverb']=rv;mix=sum(S2.values())
fi=int(2*beat*SR);mix[:fi]*=np.linspace(0,1,fi)[:,None]
o0=int(sum(n for _,n in SECT[:-1])*4*beat*SR);mix[o0:]*=np.linspace(1,0,N-o0)[:,None]**1.5
sc=0.7/np.abs(mix).max();os.makedirs(f'{OUT}/stems',exist_ok=True)
for k,x in S2.items(): sf.write(f'{OUT}/stems/{k}.flac',(x*sc).astype('float32'),SR,subtype='PCM_24')
mel=S2['piano']+S2['choeur']+S2['cloche']+rv
sf.write(f'{OUT}/mix.wav',(mix*sc).astype('float32'),SR);sf.write(f'{OUT}/melodie.wav',(mel*0.7/np.abs(mel).max()).astype('float32'),SR)
print('mesures',NB,'durée',round(N/SR,1))
