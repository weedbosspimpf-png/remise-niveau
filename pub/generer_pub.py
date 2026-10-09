import sys,numpy as np,soundfile as sf,mido
from scipy.signal import butter,sosfilt,fftconvolve
OUT=sys.argv[1];BPM=120;SR=44100;beat=60/BPM;rng=np.random.default_rng(3)
f=lambda n:440*2**((n-69)/12)
lp=lambda x,fc:sosfilt(butter(2,fc,'low',fs=SR,output='sos'),x);hp=lambda x,fc,o=2:sosfilt(butter(o,fc,'high',fs=SR,output='sos'),x)
CH=[(48,[60,64,67]),(43,[59,62,67]),(45,[60,64,69]),(41,[60,65,69])]   # C – G – Am – F
HOOK=[(0,76,.5),(.5,79,.5),(1,81,1),(2,79,.5),(2.5,76,.5),(3,74,1),(4,74,.5),(4.5,76,.5),(5,79,1),(6,76,1.5),(7.5,72,.5),
      (8,76,.5),(8.5,79,.5),(9,81,1),(10,84,1),(11,81,.5),(11.5,79,.5),(12,77,.5),(12.5,76,.5),(13,74,1),(14,72,2)]
def build(plan,total_s,name):
  # plan: list of (bar_index, set_of_layers); final 'button' hit after last bar
  N=int(total_s*SR);T={k:np.zeros(N) for k in['pad','pluck','piano','bass','kick','clap','shaker','cloche','fx']};ev={k:[] for k in T}
  def put(k,tb,x):
    a=int(tb*beat*SR);e=min(N,a+len(x));
    if a<N: T[k][a:e]+=x[:e-a]
  nb=len(plan)
  for b,L in enumerate(plan):
    root,notes=CH[b%4];t0=b*4
    if 'pad' in L:
      for n in notes: ev['pad'].append((t0,n,4))
    if 'pluck' in L:
      arp=[notes[0],notes[1],notes[2],notes[1]+12,notes[2],notes[1],notes[0]+12,notes[2]]
      for j,n in enumerate(arp): ev['pluck'].append((t0+j*0.5,n,0.5))
    if 'piano' in L:
      for s in(0,1.5,2.5):
        for n in notes: ev['piano'].append((t0+s,n-12,1))
    if 'bass' in L:
      for s,d in((0,1),(1.5,.5),(2,1),(3.5,.5)): ev['bass'].append((t0+s,root-12 if s!=3.5 else root,d))
    if 'kick' in L:
      for s in range(4): ev['kick'].append((t0+s,36,.2))
    if 'clap' in L:
      for s in(1,3): ev['clap'].append((t0+s,39,.2))
    if 'shaker' in L:
      for j in range(8): ev['shaker'].append((t0+j*0.5+0.25*(j%2==1)*0,82,.1))
    if 'hook' in L:
      h0=(b%4)*4;
      for s,n,d in HOOK:
        if h0<=s<h0+4: ev['cloche'].append((t0+s-h0,n,d))
    if 'riser' in L: ev['fx'].append(('riser',t0))
  tb=nb*4;ev['fx'].append(('button',tb))
  for n in[48,60,64,67,72]: ev['piano'].append((tb,n,4))
  ev['bass'].append((tb,36,3));ev['kick'].append((tb,36,.2));ev['cloche'].append((tb,84,3))
  for t,n,d in ev['pad']:
    L=int((d*beat+1)*SR);tt=np.arange(L)/SR;x=sum(2*((tt*f(n+dt))%1)-1 for dt in(-.07,0,.07));x=lp(x,2500)*np.minimum(1,tt/0.4)*np.minimum(1,(L/SR-tt)/0.8);put('pad',t,x*0.03)
  for t,n,d in ev['pluck']:
    L=int(0.6*SR);tt=np.arange(L)/SR;x=2*((tt*f(n))%1)-1
    o=np.zeros(L);seg=512
    for a in range(0,L,seg): o[a:a+seg]=lp(x[a:a+seg],800+5000*np.exp(-a/SR*12))
    put('pluck',t,o*np.exp(-tt*7)*0.09)
  for t,n,d in ev['piano']:
    L=int((d*beat+1.2)*SR);tt=np.arange(L)/SR;x=sum(np.sin(2*np.pi*f(n)*h*tt)*np.exp(-tt*(1.5+h))/h**1.3 for h in range(1,7));x[:60]*=np.linspace(0,1,60);put('piano',t,x*0.07)
  for t,n,d in ev['bass']:
    L=int(d*beat*SR);tt=np.arange(L)/SR;x=np.sin(2*np.pi*f(n)*tt)+0.3*lp(2*((tt*f(n))%1)-1,600);e=np.exp(-tt*1.5);e[-300:]*=np.linspace(1,0,300);put('bass',t,x*e*0.3)
  for t,*_ in ev['kick']:
    L=int(0.25*SR);tt=np.arange(L)/SR;put('kick',t,np.sin(2*np.pi*np.cumsum(55+130*np.exp(-tt*40))/SR)*np.exp(-tt*14)*0.45)
  for t,*_ in ev['clap']:
    L=int(0.3*SR);tt=np.arange(L)/SR;x=sosfilt(butter(2,[1000,9000],'band',fs=SR,output='sos'),rng.standard_normal(L))*np.exp(-tt*16)
    for dl in(0,.01,.02): put('clap',t+dl/beat,x*0.12)
  for t,*_ in ev['shaker']:
    L=int(0.09*SR);tt=np.arange(L)/SR;x=hp(rng.standard_normal(L),6000,4)*np.sin(np.pi*np.minimum(1,tt/0.09))**2;put('shaker',t,x*0.05)
  for t,n,d in ev['cloche']:
    L=int((d*beat+1)*SR);tt=np.arange(L)/SR;x=(np.sin(2*np.pi*f(n)*tt)+0.4*np.sin(2*np.pi*f(n)*4*tt)*np.exp(-tt*6))*np.exp(-tt*2.5);x[:40]*=np.linspace(0,1,40);put('cloche',t,x*0.09)
  for typ,t in ev['fx']:
    if typ=='riser':
      L=int(4*beat*SR);x=rng.standard_normal(L);o=np.zeros(L)
      for a in range(0,L,2048):
        fc=500+8000*(a/L)**2;o[a:a+2048]=sosfilt(butter(2,[fc,min(fc*1.5,20000)],'band',fs=SR,output='sos'),x[a:a+2048])
      put('fx',t,o*np.linspace(0,1,L)**2*0.12)
    else:
      L=int(1.5*SR);tt=np.arange(L)/SR;put('fx',t,hp(rng.standard_normal(L),3000)*np.exp(-tt*3)*0.05)
  # réverb
  L=int(1.8*SR);tt=np.arange(L)/SR;ir=rng.standard_normal((L,2))*np.exp(-tt*6.9/1.6)[:,None];ir=sosfilt(butter(2,[300,9000],'band',fs=SR,output='sos'),ir,axis=0);ir/=np.sqrt((ir**2).sum(0)).max()
  send=T['cloche']*0.5+T['piano']*0.3+T['pluck']*0.3+T['clap']*0.2+T['pad']*0.2
  rv=np.stack([fftconvolve(send,ir[:,c])[:N] for c in(0,1)],1)*0.6
  pan={'pad':(.9,1),'pluck':(.7,1),'piano':(1,.8),'bass':(1,1),'kick':(1,1),'clap':(1,1),'shaker':(.6,1),'cloche':(1,.85),'fx':(1,1)}
  mix=sum(np.stack([x*pan[k][0],x*pan[k][1]],1) for k,x in T.items())+rv
  fo=int(0.25*SR);mix[-fo:]*=np.linspace(1,0,fo)[:,None]
  sf.write(f'{OUT}/{name}.wav',(mix*0.8/np.abs(mix).max()).astype('float32'),SR)
  # MIDI
  mf=mido.MidiFile(ticks_per_beat=480);meta=mido.MidiTrack();mf.tracks.append(meta);meta.append(mido.MetaMessage('set_tempo',tempo=mido.bpm2tempo(BPM)))
  for k,(c,p) in {'pad':(0,89),'pluck':(1,45),'piano':(2,0),'bass':(3,33),'cloche':(4,9),'kick':(9,0),'clap':(9,0),'shaker':(9,0)}.items():
    tr=mido.MidiTrack();tr.append(mido.MetaMessage('track_name',name=k))
    if c!=9: tr.append(mido.Message('program_change',program=p,channel=c))
    ms=[]
    for t,n,d in ev[k]: ms+=[(int(t*480),1,mido.Message('note_on',note=n,velocity=95,channel=c)),(int((t+d)*480),0,mido.Message('note_off',note=n,velocity=0,channel=c))]
    ms.sort(key=lambda m:(m[0],m[1]));lt=0
    for tk,_,m in ms: m.time=tk-lt;lt=tk;tr.append(m)
    mf.tracks.append(tr)
  mf.save(f'{OUT}/{name}.mid')
A={'pad','pluck'};Bset={'pad','pluck','piano','shaker','bass'};F={'pad','pluck','piano','shaker','bass','kick','clap','hook'}
p30=[A,A|{'cloche'}]+[Bset]*3+[Bset|{'riser'}]+[F]*8      # 14 mesures = 28 s + 2 s de fin
p30[1]=A
p15=[A|{'riser'}]+[F]*6                                     # 7 mesures = 14 s + 1 s de fin
p60=[A,A,Bset,Bset,Bset,Bset|{'riser'}]+[F]*8+[Bset,Bset,Bset|{'riser'}]+[F]*8+[F-{'kick'}]   # 28 mesures = 56 s + fin
build(p15,15.0,'PUB_15s');build(p30,30.0,'PUB_30s');build(p60,60.0,'PUB_60s')
