const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const bodyParser = require('body-parser');
const { buildSchema } = require('graphql');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const User = require('./models/User');
const Event = require('./models/Event');
require('dotenv').config();

const app = express();

mongoose
    .connect(process.env.DB_URL)
    .then((result) => {
        console.log('Database connected');
    })
    .catch((error) => {
        console.log('error := ', error);
    });

app.use(bodyParser.json());

const getUser = (userID) => {
    return User.findById({
        _id: userID,
    })
        .then((user) => {
            return {
                ...user._doc,
                createdEvents: getEvents.bind(this, user.createdEvents),
            };
        })
        .catch((error) => {
            console.log('error := ', error);
            throw error;
        });
};

const getEvents = (eventIds) => {
    return Event.find({
        _id: { $in: eventIds },
    })
        .then((events) => {
            return events.map((event) => {
                return {
                    ...event._doc,
                    creator: getUser.bind(this, event.creator._id),
                };
            });
        })
        .catch((error) => {
            console.log('error := ', error);
            throw error;
        });
};

app.use(
    '/graphql',
    graphqlHTTP({
        schema: buildSchema(`

            type User {
                _id: ID!
                email: String!
                createdEvents: [Event!]
            }

            type Event {
                _id: ID!
                title: String!
                description: String!
                price: Float!
                date: String!
                creator: User!
            }

            input EventInput {
                title: String!
                description: String!
                price: Float!
                date: String!
            }

            input UserInput {
                email: String!
                password: String!
            }

            type RootQuery {
                events: [Event!]!
            }

            type RootMutation {
                createEvent(eventInput: EventInput) : Event!
                createUser(userInput: UserInput) : User!
            }

            schema {
                query: RootQuery
                mutation: RootMutation
            }
        `),
        rootValue: {
            events: async () => {
                const allEvents = await Event.find().populate('creator');
                return allEvents.map((event) => {
                    console.log("====> ", event.creator._id);
                    const e = {
                        ...event._doc,
                        _id: event._doc._id.toString(),
                        creator: getUser.bind(this, event.creator._doc._id.toString()), 
                    };
                    return e;
                });
            },

            createEvent: async (args) => {
                try {
                    const newEvent = new Event({
                        title: args.eventInput.title,
                        description: args.eventInput.description,
                        price: +args.eventInput.price,
                        date: new Date(args.eventInput.date),
                        creator: '64c3e120457b84540c661e61',
                    });
                    const savedDocument = await newEvent.save();
                    console.log(savedDocument);

                    const user = await User.findOne({
                        _id: '64c3e120457b84540c661e61',
                    });
                    if (!user) {
                        throw new Error('User not exist with this ID');
                    }
                    user.createdEvents.push(newEvent);
                    await user.save();

                    return savedDocument;
                } catch (error) {
                    console.log('error := ', error);
                    throw error;
                }
            },

            createUser: async (args) => {
                try {
                    const user = await User.findOne({
                        email: args.userInput.email,
                    });
                    if (user) {
                        throw new Error('Email ID already used!');
                    }

                    const salt = bcrypt.genSaltSync(10);
                    const hashedPassword = bcrypt.hashSync(
                        args.userInput.password,
                        salt
                    );

                    const newUser = new User({
                        email: args.userInput.email,
                        password: hashedPassword,
                    });

                    const savedUser = await newUser.save();
                    return savedUser;
                } catch (error) {
                    console.log('createUser catch error := ', error);
                    throw error;
                }
            },
        },
        graphiql: true,
    })
);

app.listen(4000, () => {
    console.log('Server running at port 4000.');
});
