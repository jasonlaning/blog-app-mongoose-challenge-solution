const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const should = chai.should();

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

function seedBlogPostData() {
	console.info('seeding blogposts data');
	const seedData = [];

	for (let i = 1; i <= 10; i++) {
		seedData.push(generateBlogPostData());
	}
	return BlogPost.insertMany(seedData);
}

function generateBlogPostData() {
	return {
		author: {
			firstName: faker.name.firstName(),
			lastName: faker.name.lastName()
		},
		title: faker.lorem.sentence(),
		content: faker.lorem.paragraph(),
		created: faker.date.past()
	}
}

function tearDownDb() {
	console.warn('Deleting database');
	return mongoose.connection.dropDatabase();
}

describe('BlogPosts API resource', function() {
	
	before(function() {
		return runServer(TEST_DATABASE_URL);
	});

	beforeEach(function() {
		return seedBlogPostData();
	});

	afterEach(function() {
		return tearDownDb();
	});

	after(function() {
		return closeServer();
	})

	describe('GET endpoint', function() {

		it('should return all existing blogposts', function() {
			let res;
			return chai.request(app)
				.get('/posts')
				.then(function(_res) {
					res = _res;
					res.should.have.status(200);
					res.body.blogposts.should.have.length.of.at.least(1);
					return BlogPost.count();
				})
				.then(function(count) {
					res.body.blogposts.should.have.length.of(count);
				});
		});

		it('should return blogposts with right fields', function() {

			let resBlogPost;
			return chai.request(app)
				.get('/posts')
				.then(function(res) {
					res.should.have.status(200);
					res.should.be.json;
					res.body.blogposts.should.be.a('array');
					res.body.blogposts.should.have.length.of.at.least(1);

					res.body.blogposts.forEach(function(blogpost) {
						blogpost.should.be.a('object');
						blogpost.should.include.keys(
							'id', 'title', 'author', 'content', 'created');
					});
					resBlogPost = res.body.blogposts[0];
					return BlogPost.findById(resBlogPost.id);
				})
				.then(function(blogpost) {
					resBlogPost.id.should.equal(blogpost.id);
					resBlogPost.title.should.equal(blogpost.title);
					resBlogPost.author.should.equal(blogpost.authorName);
					resBlogPost.content.should.equal(blogpost.content);
				});
		});
	});

// POST GOES HERE
	describe('POST endpoint', function() {
		it('should add a new blogpost', function() {
			const newBlogPost = generateBlogPostData();
			let authorFullName;

			return chai.request(app)
				.post('/posts')
				.send(newBlogPost)
				.then(function(res) {
					res.should.have.status(201);
					res.should.be.json;
					res.body.should.be.a('object');
					res.body.should.include.keys(
						'id', 'title', 'author', 'content', 'created');
					res.body.title.should.equal(newBlogPost.title);

					authorFullName = `${newBlogPost.author.firstName} ${newBlogPost.author.lastName}`.trim();
					res.body.author.should.equal(authorFullName);
					res.body.content.should.equal(newBlogPost.content);
					return BlogPost.findById(res.body.id);
				})
				.then(function(blogpost) {
					blogpost.title.should.equal(newBlogPost.title);
					blogpost.author.firstName.should.equal(newBlogPost.author.firstName);
					blogpost.author.lastName.should.equal(newBlogPost.author.lastName);
					blogpost.content.should.equal(newBlogPost.content);
					blogpost.created.should.not.be.undefined;
				});
		});
	});

// PUT GOES HERE
	describe('PUT endpoint', function() {
		it('should update fields you send over', function() {
			const updateData = {
				title: 'something something',
				content: 'something else',
			};

			return BlogPost
				.findOne()
				.exec()
				.then(function(blogpost) {
					updateData.id = blogpost.id;

					return chai.request(app)
						.put(`/posts/${blogpost.id}`)
						.send(updateData);
				})
				.then(function(res) {
					res.should.have.status(201);
					res.body.title.should.equal(updateData.title);
					res.body.content.should.equal(updateData.content);

					return BlogPost.findById(updateData.id).exec();
				})
				.then(function(blogpost) {
					blogpost.title.should.equal(updateData.title);
					blogpost.content.should.equal(updateData.content);
				});
		});
	});

//DELETE GOES HERE
	describe('DELETE endpoint', function() {
		it('delete a blogpost by id', function() {
			let blogpost;

			return BlogPost
				.findOne()
				.exec()
				.then(function(_blogpost) {
					blogpost = _blogpost;
					return chai.request(app).delete(`/posts/${blogpost.id}`);
				})
				.then(function(res) {
					res.should.have.status(204);
					return BlogPost.findById(blogpost.id).exec();
				})
				.then(function(_blogpost) {
					should.not.exist(_blogpost);
				});
		});
	});
});