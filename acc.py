from flask import Flask, render_template


app = Flask(__name__)
# app.debug = True


@app.route('/')
def index():
	return render_template('index.html')

@app.route('/test')
def test():
	return render_template('test.html')


@app.route('/about')
def about():
	return render_template('about.html')

if __name__ == '__main__':
	app.run()
