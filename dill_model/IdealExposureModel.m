clc;clear all;
C=0.022;
a=11.7*pi/180;

X=-1000:1:1000;
I0=-1000:1:1000;
D0=-1000:1:1000;
M=-1000:1:1000;
H=-1000:1:1000;

ctr=1; 
t=[30,60,250,1000,2000];
cd=20;

plot([-1 1],[0 0],'k','linestyle',':','linewidth',1.5)
hold on

I0=0.5*(1+ctr*cos((4*pi*sin(a)/405)*X));
plot(X/1000,I0,'linestyle','--','linewidth',1.5)
hold on

for k=1:length(t)
    D0=0.5*(1+ctr*cos((4*pi*sin(a)/405)*X))*t(k);
    for i=1:length(X)
        if D0(i)<cd
            M(i)=1;
        else
            M(i)=exp(-C*(D0(i)-cd));
        end
        H(i)=1-M(i);
    end 
    plot(X/1000,-H,'linewidth',1.5)
    hold on 
end

set(gca,'FontWeight','bold','FontName','Arial','FontSize',16)
set(gca,'XTick',[-1:0.2:1])
set(gca,'YTick',[-1:0.2:1])
set(gca,'XtickLabel',{'-1','-0.8','-0.6','-0.4','-0.2','0','0.2','0.4','0.6','0.8','1'})
set(gca,'YtickLabel',{'-1','-0.8','-0.6','-0.4','-0.2','0','0.2','0.4','0.6','0.8','1'})    
    
    