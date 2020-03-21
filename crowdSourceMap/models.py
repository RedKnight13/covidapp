from django.db import models
from datetime import datetime
# Create your models here.
class HeatMap(models.Model):
	mid=models.IntegerField()
	lat=models.CharField(max_length=32)
	lng=models.CharField(max_length=32)
	timestamp=models.DateTimeField(default=datetime.now())
	active=models.IntegerField(default=0)

class MarkUp(models.Model):
	recorder=models.CharField(max_length=64)
	ip=models.CharField(max_length=128)
	patientId=models.CharField(max_length=32)
	patientStart=models.DateTimeField(default=None)
	patientEnd=models.DateTimeField(default=None)
	timestamp=models.DateTimeField(default=datetime.now())
	active=models.IntegerField(default=0)

class VisitorIp(models.Model):
	ip=models.CharField(max_length=64)
