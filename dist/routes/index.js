"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const myRouter = express_1.default.Router();
myRouter.get('/', (req, res) => {
    res.json({ message: 'This is a / path.' });
});
myRouter.post('/');
exports.default = myRouter;
