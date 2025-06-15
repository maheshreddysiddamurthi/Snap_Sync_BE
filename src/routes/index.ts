import express, { Request, Response, Router, RequestHandler } from 'express';

const myRouter: Router = express.Router();

myRouter.get('/', (req, res) => {
    res.json({ message: 'This is a / path.' });
});
myRouter.post('/')

export default myRouter; 