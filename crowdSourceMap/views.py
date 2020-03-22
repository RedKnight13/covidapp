from django.shortcuts import render
from django.http import HttpResponse
import json
from .models import HeatMap,MarkUp,VisitorIp
from django.views.decorators.csrf import csrf_exempt
# Create your views here.
def indexpage(request):
	ip=get_client_ip(request)
	try:
		visitorIp=VisitorIp(ip=ip)
		visitorIp.save()
	except Exception as e:
		print(e)
		print("Unable to save Visitor IpAddress")
	return render(request,"holderPage.html")


def get_client_ip(request):
	try:
	    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
	    if x_forwarded_for:
	        ip = x_forwarded_for.split(',')[0]
	    else:
	        ip = request.META.get('REMOTE_ADDR')

	    print("Client IP => ",ip)
	except Exception as e:
		print(e)
		ip="Error"
	return ip
    # response=dict()
    # response["IpAddress"]=ip
    # jsondata=json.dumps(response)
    # return HttpResponse(jsondata,content_type="application/json")
@csrf_exempt
def getData(request):
	response=dict()
	try:
		markUp=MarkUp.objects.all()
		for i in markUp:
			heatmap=HeatMap.objects.filter(mid=i.id)
			index=0
			respObj=dict()
			for j in heatmap:
				respObj["id"]=i.id
				respObj["lat"]=j.lat
				respObj["lng"]=j.lng
				respObj["startTime"]=str(i.patientStart)
				respObj["endTime"]=str(i.patientEnd)
				response[index]=respObj
				index+=1
	except Exception as e:
		print("GetDataError: ",e)

	jsonResponse=json.dumps(response)
	return HttpResponse(jsonResponse,content_type="application/json")

@csrf_exempt
def saveData(request):
	response=dict()
	try:
		data=json.loads(request.POST.get('heatmap',None))
		recorder=request.POST['recorder']
		patientId=request.POST['patientId']
		patientStart=request.POST['patientStart']
		patientEnd=request.POST['patientEnd']

		if(data is None):
			response["msg"]="HeatMap Empty"
			jsonResponse=json.dumps(response)
			return HttpResponse(jsonResponse,content_type="application/json")
		# else:
			# data=data.strip()
		print("Data=>",data)
		markUp=MarkUp(recorder=recorder,ip=str(get_client_ip(request)),patientId=patientId,patientStart=patientStart,
			patientEnd=patientEnd)
		try:
			markUp.save()
			for i in data:
				print("i->",i)
				print(markUp.id)
				heatmapObj=HeatMap(mid=markUp.id,lat=str(i[0]),lng=str(i[1]),active=1)
				heatmapObj.save()
			response["patientId"]=patientId
			response["recorder"]=recorder
			response["id"]=markUp.id
		except Exception as e:
			print("MarkUp Save Failed: ",e)
	except Exception as e:
		print(e)

	jsonResponse=json.dumps(response)
	return HttpResponse(jsonResponse,content_type="application/json")