clc;clear all;
C=0.022;
a=11.7*pi/180;

X=-1000:5:1000;
Y=-1000:5:1000;
I0=-1000:5:1000;
D0=-1000:5:1000;
M=-1000:5:1000;
H=-1000:5:1000;

t=[15,30,100,1000];
ctr=0.9;
cd=25;

figure(1);
for m=1:length(t)
for j=1:length(Y)
for i=1:length(X)
D0(i,j)=0.5*(1+ctr*cos((4*pi*sin(a)/405)*X(i)))*t(m);    
end 
end
D=D0+D0';
for j=1:length(Y)
for i=1:length(X)
if D(i,j)<cd
M(i,j)=1;
else
M(i,j)=exp(-C*(D(i,j)-cd));
end
H(i,j)=1-M(i,j);
end 
end 
subplot(2,2,m)
mesh(X/1000,Y/1000,-H)
view([0,90])
xlabel('x');
ylabel('y');
title(['Exposure time = ',num2str(t(m))],'FontSize',10);
axis equal
xlim([-1,1]);
ylim([-1,1]);
zlim([-1,0]);

end

sgtitle(['Contrast = ',num2str(ctr),', Threshold dose = ',num2str(cd)],'FontSize',10)





    