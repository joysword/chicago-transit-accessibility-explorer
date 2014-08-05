from flask import Flask, render_template, request, url_for, jsonify
import json

import os

app = Flask(__name__)
# app.debug = True

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/about')
def about():
	return render_template('about.html')

@app.route('/showmap')
def showmap():

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

	# filename = 'static/json/acc_'

	# if transit == 'auto':
	# 	filename = filename + 'auto_' + threshold + '.geojson'
	# else:
	# 	filename = filename + 'transit_' + time + '_' + threshold + '.geojson'

	# f = open(os.path.join(os.path.dirname(__file__), filename), 'r')

	f = open(os.path.join(os.path.dirname(__file__), 'static/json/acc_auto_300.geojson'), 'r')
	
	ret = json.load(f)

	return jsonify(ret=ret)

if __name__ == '__main__':
    app.run()
