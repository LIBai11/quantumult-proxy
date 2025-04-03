import express from 'express';
import * as captureController from '../controllers/captureController.js';

const router = express.Router();

// Quantumult X 重写捕获路由
router.post('/capture/request', captureController.captureRequest);
router.post('/capture/response', captureController.captureResponse);
router.post('/capture/response/modify', captureController.modifyResponse);
export default router;
