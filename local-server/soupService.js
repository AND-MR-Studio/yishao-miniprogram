const fs = require('fs-extra');
const path = require('path');

// 数据文件路径
const SOUPS_FILE = path.join(__dirname, 'soups.json');

// 初始化数据文件
async function initSoupsFile() {
  try {
    await fs.ensureFile(SOUPS_FILE);
    const exists = await fs.pathExists(SOUPS_FILE);
    if (exists) {
      const data = await fs.readFile(SOUPS_FILE, 'utf8');
      if (!data || data.trim() === '') {
        // 初始化空数据
        const initialData = [
          {
            soupId: 'local_001',
            title: '《本地测试汤面1》',
            contentLines: ['这是一个', '本地测试汤面', '用于开发环境测试'],
            truth: '这是一个测试用的汤底',
            createTime: new Date().toISOString(),
            updateTime: new Date().toISOString()
          },
          {
            soupId: 'local_002',
            title: '《本地测试汤面2》',
            contentLines: ['又一个', '本地测试汤面', '开发环境专用'],
            truth: '这是另一个测试用的汤底',
            createTime: new Date().toISOString(),
            updateTime: new Date().toISOString()
          }
        ];
        await fs.writeJson(SOUPS_FILE, initialData);
      }
    }
  } catch (err) {
    console.error('初始化汤面数据文件失败:', err);
  }
}

// 读取所有汤面数据
async function getAllSoups() {
  try {
    await initSoupsFile();
    const data = await fs.readJson(SOUPS_FILE);
    return data || [];
  } catch (err) {
    console.error('读取汤面数据失败:', err);
    return [];
  }
}

// 保存所有汤面数据
async function saveSoups(soups) {
  try {
    console.log('准备保存数据:', JSON.stringify(soups, null, 2).substring(0, 200) + '...');
    await fs.writeJson(SOUPS_FILE, soups);
    return true;
  } catch (err) {
    console.error('保存汤面数据失败:', err);
    return false;
  }
}

// 初始化汤面服务路由
function initSoupRoutes(app) {
  // 获取所有汤面
  app.get('/api/soup/list', async (req, res) => {
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

  // 获取随机汤面
  app.get('/api/soup/random', async (req, res) => {
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

  // 获取单个汤面
  app.get('/api/soup/detail/:soupId', async (req, res) => {
    try {
      const soups = await getAllSoups();
      const soup = soups.find(s => s.soupId === req.params.soupId);

      if (soup) {
        res.json({
          success: true,
          data: soup
        });
      } else {
        res.status(404).json({
          success: false,
          error: '汤面不存在'
        });
      }
    } catch (err) {
      res.status(500).json({
        success: false,
        error: '获取汤面失败',
        details: err.message
      });
    }
  });

  // 添加汤面 - 兼容旧API
  app.post('/api/soup/add', async (req, res) => {
    try {
      const { title, contentLines, truth } = req.body;

      if (!title || !contentLines || !Array.isArray(contentLines)) {
        return res.status(400).json({
          success: false,
          error: '无效的汤面数据'
        });
      }

      const soups = await getAllSoups();
      const newSoup = {
        soupId: `local_${Date.now()}`,
        title,
        contentLines,
        truth,
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      };

      soups.push(newSoup);

      if (await saveSoups(soups)) {
        res.status(201).json({
          success: true,
          data: newSoup
        });
      } else {
        res.status(500).json({
          success: false,
          error: '保存汤面失败'
        });
      }
    } catch (err) {
      res.status(500).json({
        success: false,
        error: '添加汤面失败',
        details: err.message
      });
    }
  });

  // 添加汤面 - 新API
  app.post('/api/soup/add', async (req, res) => {
    console.log('收到添加汤面请求 - 新API:', req.body);
    try {
      const { title, contentLines, truth } = req.body;

      if (!title || !contentLines || !Array.isArray(contentLines)) {
        return res.status(400).json({
          success: false,
          error: '无效的汤面数据'
        });
      }

      const soups = await getAllSoups();
      const newSoup = {
        soupId: `local_${Date.now()}`,
        title,
        contentLines,
        truth,
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      };

      soups.push(newSoup);

      if (await saveSoups(soups)) {
        res.status(201).json({
          success: true,
          data: newSoup
        });
      } else {
        res.status(500).json({
          success: false,
          error: '保存汤面失败'
        });
      }
    } catch (err) {
      res.status(500).json({
        success: false,
        error: '添加汤面失败',
        details: err.message
      });
    }
  });

  // 更新汤面
  app.put('/api/soup/update/:soupId', async (req, res) => {
    try {
      const { title, contentLines, truth } = req.body;

      console.log('更新汤面请求:', req.params.soupId);
      console.log('请求体数据:', req.body);

      if (!title || !contentLines || !Array.isArray(contentLines)) {
        return res.status(400).json({
          success: false,
          error: '无效的汤面数据'
        });
      }

      const soups = await getAllSoups();
      const index = soups.findIndex(s => s.soupId === req.params.soupId);

      if (index === -1) {
        return res.status(404).json({
          success: false,
          error: '汤面不存在'
        });
      }

      const updatedSoup = {
        ...soups[index],
        title,
        contentLines,
        truth,
        updateTime: new Date().toISOString()
      };

      console.log('更新前的汤面:', soups[index]);
      console.log('更新后的汤面:', updatedSoup);

      soups[index] = updatedSoup;

      if (await saveSoups(soups)) {
        console.log('汤面更新成功，已保存到文件');
        res.json({
          success: true,
          data: updatedSoup
        });
      } else {
        console.error('汤面更新失败，保存文件时出错');
        res.status(500).json({
          success: false,
          error: '更新汤面失败'
        });
      }
    } catch (err) {
      res.status(500).json({
        success: false,
        error: '更新汤面失败',
        details: err.message
      });
    }
  });

  // 删除汤面
  app.delete('/api/soup/delete/:soupId', async (req, res) => {
    try {
      const soups = await getAllSoups();
      const index = soups.findIndex(s => s.soupId === req.params.soupId);

      if (index === -1) {
        return res.status(404).json({
          success: false,
          error: '汤面不存在'
        });
      }

      soups.splice(index, 1);

      if (await saveSoups(soups)) {
        res.json({
          success: true,
          data: {
            message: '删除成功'
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: '删除汤面失败'
        });
      }
    } catch (err) {
      res.status(500).json({
        success: false,
        error: '删除汤面失败',
        details: err.message
      });
    }
  });
}

// 初始化模块
async function init() {
  await initSoupsFile();
  console.log('汤面服务初始化完成');
}

module.exports = {
  init,
  initSoupRoutes,
  getAllSoups,
  saveSoups
};
