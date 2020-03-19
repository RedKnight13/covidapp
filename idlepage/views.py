from django.shortcuts import render

# Create your views here.
def idlepg(request):
	return render(request,"index.html")

def page01(request):
	return render(request,"demoDummy.html")