const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
router.use(cors());
router.use(bodyParser.json());

// 数据文件路径
const SOUPS_FILE = path.join(__dirname, 'soups.json');

// 确保数据文件存在
const initDataFile = async () => {
  try {
    await fs.ensureFile(SOUPS_FILE);
    const exists = await fs.pathExists(SOUPS_FILE);
    if (exists) {
      const data = await fs.readFile(SOUPS_FILE, 'utf8');
      if (!data) {
        // 初始化空数据
        await fs.writeJson(SOUPS_FILE, [
          {
            soupId: 'default_001',
            title: '《找到你了》',
            contentLines: [
              '哒..哒...哒....',
              '咚咚咚',
              '哗啦哗啦',
              '哒…哒…哒…"我找到你了哦…"'
            ],
            truth: '这是一个关于捉迷藏的故事，最后找到的是鬼。',
            createTime: new Date().toISOString(),
            updateTime: new Date().toISOString()
          }
        ]);
      }
    }
  } catch (err) {
    console.error('初始化数据文件失败:', err);
  }
};

// 读取所有汤面数据
const getAllSoups = async () => {
  try {
    await initDataFile();
    const data = await fs.readJson(SOUPS_FILE);
    return data || [];
  } catch (err) {
    console.error('读取汤面数据失败:', err);
    return [];
  }
};

// 保存所有汤面数据
const saveSoups = async (soups) => {
  try {
    await fs.writeJson(SOUPS_FILE, soups);
    return true;
  } catch (err) {
    console.error('保存汤面数据失败:', err);
    return false;
  }
};

// API路由

// 1. 获取所有汤面列表
router.get('/api/soups/list', async (req, res) => {
  try {
    const soups = await getAllSoups();
    
    res.json({
      success: true,
      data: {
        soups,
        total: soups.length
      }
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: '获取汤面列表失败',
      details: err.message 
    });
  }
});

// 2. 获取单个汤面
router.get('/api/soups/:soupId', async (req, res) => {
  try {
    const { soupId } = req.params;
    const soups = await getAllSoups();
    const soup = soups.find(s => s.soupId === soupId);
    
    if (!soup) {
      return res.status(404).json({ 
        success: false,
        error: '找不到指定的汤面' 
      });
    }
    
    res.json({
      success: true,
      data: soup
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: '获取汤面详情失败',
      details: err.message 
    });
  }
});

// 3. 获取随机汤面
router.get('/api/soups/random', async (req, res) => {
  try {
    const soups = await getAllSoups();
    
    if (soups.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: '没有可用的汤面' 
      });
    }
    
    const randomIndex = Math.floor(Math.random() * soups.length);
    const randomSoup = soups[randomIndex];
    
    res.json({
      success: true,
      data: randomSoup
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: '获取随机汤面失败',
      details: err.message 
    });
  }
});

// 初始化数据文件
initDataFile();

module.exports = router; 