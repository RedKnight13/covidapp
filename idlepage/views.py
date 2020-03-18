from django.shortcuts import render

# Create your views here.
def idlepg(request):
	return render(request,"index.html")