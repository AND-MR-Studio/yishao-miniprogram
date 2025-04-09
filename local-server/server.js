const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 8081;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../static')));

// 数据文件路径
const DATA_FILE = path.join(__dirname, 'soups.json');

// 初始化数据文件
if (!fs.existsSync(DATA_FILE)) {
  const initialData = [
    {
      soupId: 'local_001',
      title: '《本地测试汤面1》',
      contentLines: ['这是一个', '本地测试汤面', '用于开发环境测试']
    },
    {
      soupId: 'local_002',
      title: '《本地测试汤面2》',
      contentLines: ['又一个', '本地测试汤面', '开发环境专用']
    }
  ];
  fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
}

// 读取汤面数据
function getSoupsData() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('读取汤面数据失败:', error);
    return [];
  }
}

// 保存汤面数据
function saveSoupsData(soups) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(soups, null, 2));
    return true;
  } catch (error) {
    console.error('保存汤面数据失败:', error);
    return false;
  }
}

// API路由
// 获取所有汤面
app.get('/api/soups/list', (req, res) => {
  const soups = getSoupsData();
  res.json(soups);
});

// 获取单个汤面
app.get('/api/soups/:soupId', (req, res) => {
  const soups = getSoupsData();
  const soup = soups.find(s => s.soupId === req.params.soupId);
  
  if (soup) {
    res.json(soup);
  } else {
    res.status(404).json({ error: '汤面不存在' });
  }
});

// 添加汤面
app.post('/api/soups', (req, res) => {
  const { title, contentLines } = req.body;
  
  if (!title || !contentLines || !Array.isArray(contentLines)) {
    return res.status(400).json({ error: '无效的汤面数据' });
  }
  
  const soups = getSoupsData();
  const newSoup = {
    soupId: `local_${Date.now()}`,
    title,
    contentLines
  };
  
  soups.push(newSoup);
  
  if (saveSoupsData(soups)) {
    res.status(201).json(newSoup);
  } else {
    res.status(500).json({ error: '保存汤面失败' });
  }
});

// 更新汤面
app.put('/api/soups/:soupId', (req, res) => {
  const { title, contentLines } = req.body;
  
  if (!title || !contentLines || !Array.isArray(contentLines)) {
    return res.status(400).json({ error: '无效的汤面数据' });
  }
  
  const soups = getSoupsData();
  const index = soups.findIndex(s => s.soupId === req.params.soupId);
  
  if (index === -1) {
    return res.status(404).json({ error: '汤面不存在' });
  }
  
  soups[index] = {
    ...soups[index],
    title,
    contentLines
  };
  
  if (saveSoupsData(soups)) {
    res.json(soups[index]);
  } else {
    res.status(500).json({ error: '更新汤面失败' });
  }
});

// 删除汤面
app.delete('/api/soups/:soupId', (req, res) => {
  const soups = getSoupsData();
  const index = soups.findIndex(s => s.soupId === req.params.soupId);
  
  if (index === -1) {
    return res.status(404).json({ error: '汤面不存在' });
  }
  
  soups.splice(index, 1);
  
  if (saveSoupsData(soups)) {
    res.status(204).end();
  } else {
    res.status(500).json({ error: '删除汤面失败' });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`本地服务器运行在 http://localhost:${PORT}`);
  console.log(`管理后台: http://localhost:${PORT}/admin.html`);
  console.log(`API接口: http://localhost:${PORT}/api/soups/list`);
});