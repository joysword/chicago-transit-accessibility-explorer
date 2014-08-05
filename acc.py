from flask import Flask, render_template, request, url_for, jsonify
import json

import os

app = Flask(__name__)
# app.debug = True


## in order to keep things fast, I don't want to visited files to be revisited
## I tried to only keep a set of visited files and implement the dictionary in javascript
## But it is way more difficult than in python
## So I decided to implement the dictionary in python
## But (I guess) requested geojson objects have to be stored in javascript frontend, not in python backend
## Otherwise the speed would probably still be very slow

## So the implementation:
## put (filename, index) into visited_file
## pass index back to javascript if visited
## store each filename in javascript, in the same order index

visited_file = {}
count = 0

@app.route('/')
def index():
	global visited_file
	global count

	visited_file = {}
	count = 0
	return render_template('index.html')

@app.route('/about')
def about():
	global visited_file
	global count

	visited_file = {}
	count = 0
	return render_template('about.html')

@app.route('/showmap')
def showmap():

	global visite_file
	global count

	transit = request.args.get('type')
	time = request.args.get('time')
	threshold = request.args.get('threshold')
	filt = request.args.get('filter')
	age = request.args.get('age')
	earning = request.args.get('earning')
	industry = request.args.get('industry')
	race = request.args.get('race')
	ethnicity = request.args.get('ethnicity')
	education = request.args.get('education')
	gender = request.args.get('gender')

	filename = 'static/json/acc_'

	# if transit == 'auto':
	# 	filename = filename + 'auto_' + threshold + '.geojson'
	# else:
	# 	filename = filename + 'transit_' + time + '_' + threshold + '.geojson'

	# f = open(os.path.join(os.path.dirname(__file__), filename), 'r')

	filename = filename + 'auto_300.geojson'

	if filename in visited_file:
		print 'visited, file:',filename,'index:',visited_file[filename]
		return jsonify(ret='visited', index=visited_file[filename])

	visited_file[filename]=count
	count += 1

	f = open(os.path.join(os.path.dirname(__file__), filename), 'r')
	
	ret = json.load(f)

	print 'not visited, file:',filename,'count:',count
	return jsonify(ret=ret)

if __name__ == '__main__':
	app.run()
