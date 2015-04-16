from flask import Flask, render_template


app = Flask(__name__)
# app.debug = True

@app.route('/')
def index():
	return render_template('index.html')

@app.route('/travel')
def travel():
	return render_template('travel.html')

@app.route('/combined')
def combine():
	return render_template('combined.html')

@app.route('/about')
def about():
	return render_template('about.html')

if __name__ == '__main__':
	app.run()
