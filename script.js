class QRCodeToVectorConverter {
    constructor() {
        this.originalImage = null;
        this.svgData = null;
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.imageInput = document.getElementById('imageInput');
        this.originalImageEl = document.getElementById('originalImage');
        this.originalPlaceholder = document.getElementById('originalPlaceholder');
        this.svgPreview = document.getElementById('svgPreview');
        this.svgPlaceholder = document.getElementById('svgPlaceholder');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.loading = document.getElementById('loading');
        this.statusMessage = document.getElementById('statusMessage');
        this.controlsSection = document.querySelector('.controls-section');
        this.thresholdSlider = document.getElementById('thresholdSlider');
        this.thresholdValue = document.getElementById('thresholdValue');
        // 已移除模块大小滑块
        this.styleSelect = document.getElementById('styleSelect');
        this.spacingSlider = document.getElementById('spacingSlider');
        this.spacingValue = document.getElementById('spacingValue');
        this.reprocessBtn = document.getElementById('reprocessBtn');
        this.autoOptimizeBtn = document.getElementById('autoOptimizeBtn');
        
        // 参数设置 - 使用更保守的默认值
        this.thresholdFactor = 0.5;
        // 不再暴露手动模块大小，始终自动检测
        this.blockSize = null;
        this.styleType = 'rounded';
        this.spacing = 0.08;
    }

    bindEvents() {
        this.imageInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.downloadBtn.addEventListener('click', () => this.downloadSVG());
        this.reprocessBtn.addEventListener('click', () => this.reprocessImage());
        
        // 滑块事件
        this.thresholdSlider.addEventListener('input', (e) => {
            this.thresholdFactor = parseFloat(e.target.value);
            this.thresholdValue.textContent = this.thresholdFactor.toFixed(1);
        });
        
        // 已移除模块大小滑块事件
        
        this.styleSelect.addEventListener('change', (e) => {
            this.styleType = e.target.value;
        });
        
        this.spacingSlider.addEventListener('input', (e) => {
            this.spacing = parseFloat(e.target.value);
            this.spacingValue.textContent = this.spacing.toFixed(2);
        });
        
        this.autoOptimizeBtn.addEventListener('click', () => this.autoOptimize());
    }

    showStatus(message, isError = false) {
        this.statusMessage.textContent = message;
        this.statusMessage.className = `status-message ${isError ? 'status-error' : 'status-success'}`;
        this.statusMessage.style.display = 'block';
        
        setTimeout(() => {
            this.statusMessage.style.display = 'none';
        }, 5000);
    }

    showLoading(show = true) {
        this.loading.style.display = show ? 'block' : 'none';
    }

    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            this.showStatus('请选择有效的图片文件', true);
            return;
        }

        try {
            this.showLoading(true);
            this.originalImage = await this.loadImage(file);
            this.displayOriginalImage();
            
            // 显示控制面板
            this.controlsSection.style.display = 'block';
            this.reprocessBtn.style.display = 'inline-block';
            this.autoOptimizeBtn.style.display = 'inline-block';
            
            // 更新滑块限制
            // 模块大小范围不再需要更新
            
            // 转换位图为矢量
            await this.processImage();
            
        } catch (error) {
            console.error('转换失败:', error);
            this.showStatus('转换失败: ' + error.message, true);
        } finally {
            this.showLoading(false);
        }
    }

    async processImage() {
        if (!this.originalImage) return;
        
        try {
            this.showLoading(true);
            
            // 验证参数有效性
            const validationResult = this.validateParameters(this.originalImage);
            if (!validationResult.valid) {
                this.showStatus(validationResult.message, true);
                return;
            }
            
            // 转换位图为矢量
            this.svgData = await this.convertToVector(this.originalImage);
            this.displaySVG();
            
            this.downloadBtn.style.display = 'inline-block';
            this.showStatus('转换成功！可以下载SVG文件了');
        } catch (error) {
            console.error('处理失败:', error);
            this.showStatus('处理失败: ' + error.message, true);
        } finally {
            this.showLoading(false);
        }
    }

    // 验证参数有效性
    validateParameters(image) {
        const { width, height } = image;
        // 不再校验手动模块大小，仅校验其他参数的安全范围
        
        // 检查识别精度是否在安全范围内
        if (this.thresholdFactor < 0.4 || this.thresholdFactor > 0.7) {
            return {
                valid: false,
                message: '识别精度超出安全范围，建议保持在0.4-0.7之间'
            };
        }
        
        // 检查间距是否在安全范围内
        if (this.spacing < 0.05 || this.spacing > 0.15) {
            return {
                valid: false,
                message: '间距超出安全范围，建议保持在0.05-0.15之间'
            };
        }
        
        return { valid: true };
    }

    // 更新滑块限制
    // 已移除模块大小滑块限制更新

    async reprocessImage() {
        await this.processImage();
    }

    // 自动优化参数
    async autoOptimize() {
        if (!this.originalImage) return;
        
        try {
            this.showLoading(true);
            this.showStatus('正在自动优化参数...');
            
            // 分析图像特征
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const { width, height } = this.originalImage;
            
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(this.originalImage, 0, 0, width, height);
            
            const imageData = ctx.getImageData(0, 0, width, height);
            const pixels = imageData.data;
            const processedPixels = this.preprocessImage(pixels, width, height);
            
            // 寻找最佳参数组合
            const bestParams = this.findOptimalParameters(processedPixels, width, height);
            
            // 应用最佳参数
            this.thresholdFactor = bestParams.threshold;
            this.blockSize = bestParams.blockSize;
            this.spacing = bestParams.spacing;
            
            // 更新UI
            this.thresholdSlider.value = this.thresholdFactor;
            this.thresholdValue.textContent = this.thresholdFactor.toFixed(1);
            this.blockSizeSlider.value = this.blockSize;
            this.blockSizeValue.textContent = this.blockSize;
            this.spacingSlider.value = this.spacing;
            this.spacingValue.textContent = this.spacing.toFixed(2);
            
            // 重新处理图像
            await this.processImage();
            
            this.showStatus('自动优化完成！');
            
        } catch (error) {
            console.error('自动优化失败:', error);
            this.showStatus('自动优化失败: ' + error.message, true);
        } finally {
            this.showLoading(false);
        }
    }

    // 寻找最优参数
    findOptimalParameters(pixels, width, height) {
        let bestScore = 0;
        let bestParams = {
            threshold: 0.5,
            blockSize: 4,
            spacing: 0.08
        };
        
        // 计算更安全的参数范围
        const maxModuleSize = Math.min(6, Math.floor(Math.min(width, height) / 20));
        const minModuleSize = 3;
        const safeBlockSizeRange = [];
        
        for (let size = minModuleSize; size <= maxModuleSize; size++) {
            const gridWidth = Math.floor(width / size);
            const gridHeight = Math.floor(height / size);
            if (gridWidth >= 20 && gridHeight >= 20 && gridWidth <= 80 && gridHeight <= 80) {
                safeBlockSizeRange.push(size);
            }
        }
        
        if (safeBlockSizeRange.length === 0) {
            return bestParams; // 返回默认参数
        }
        
        // 测试更保守的参数组合
        const thresholdRange = [0.4, 0.5, 0.6]; // 缩小范围
        const spacingRange = [0.05, 0.08, 0.1, 0.12]; // 缩小范围
        
        for (const threshold of thresholdRange) {
            for (const blockSize of safeBlockSizeRange) {
                for (const spacing of spacingRange) {
                    const score = this.evaluateParameterSet(pixels, width, height, threshold, blockSize, spacing);
                    
                    if (score > bestScore) {
                        bestScore = score;
                        bestParams = { threshold, blockSize, spacing };
                    }
                }
            }
        }
        
        return bestParams;
    }

    // 评估参数组合的质量
    evaluateParameterSet(pixels, width, height, threshold, blockSize, spacing) {
        // 临时设置参数
        const originalThreshold = this.thresholdFactor;
        // 不再使用手动模块大小
        
        this.thresholdFactor = threshold;
        
        try {
            // 检测模块大小
            const moduleSize = this.detectOptimalModuleSize(pixels, width, height);
            const actualModuleSize = Math.max(2, moduleSize);
            
            // 创建网格
            const grid = this.createUniformGrid(pixels, width, height, actualModuleSize);
            
            // 计算质量指标
            const qualityScore = this.calculateGridQuality(grid, actualModuleSize);
            
            return qualityScore;
            
        } finally {
            // 恢复原始参数
            this.thresholdFactor = originalThreshold;
        }
    }

    // 计算网格质量
    calculateGridQuality(grid, moduleSize) {
        if (!grid || grid.length === 0) return 0;
        
        const gridHeight = grid.length;
        const gridWidth = grid[0].length;
        
        let score = 0;
        
        // 1. 模块数量合理性 (不要太多也不要太少)
        const totalModules = gridHeight * gridWidth;
        const moduleCountScore = Math.max(0, 1 - Math.abs(totalModules - 400) / 400);
        score += moduleCountScore * 0.3;
        
        // 2. 对比度 (黑白模块的分布)
        let blackModules = 0;
        for (let y = 0; y < gridHeight; y++) {
            for (let x = 0; x < gridWidth; x++) {
                if (grid[y][x]) blackModules++;
            }
        }
        
        const blackRatio = blackModules / totalModules;
        const contrastScore = Math.max(0, 1 - Math.abs(blackRatio - 0.5) * 2);
        score += contrastScore * 0.4;
        
        // 3. 模块大小合理性
        const sizeScore = Math.max(0, 1 - Math.abs(moduleSize - 5) / 5);
        score += sizeScore * 0.3;
        
        return score;
    }

    loadImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('无法加载图片'));
            img.src = URL.createObjectURL(file);
        });
    }

    displayOriginalImage() {
        this.originalImageEl.src = this.originalImage.src;
        this.originalImageEl.style.display = 'block';
        this.originalPlaceholder.style.display = 'none';
    }

    displaySVG() {
        this.svgPreview.innerHTML = this.svgData;
        this.svgPreview.style.display = 'block';
        this.svgPlaceholder.style.display = 'none';
    }

    async convertToVector(image) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // 设置画布大小 - 提高分辨率以获得更好的识别效果
            const maxSize = 800;
            let { width, height } = image;
            
            if (width > maxSize || height > maxSize) {
                const ratio = Math.min(maxSize / width, maxSize / height);
                width *= ratio;
                height *= ratio;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // 绘制图片到画布
            ctx.drawImage(image, 0, 0, width, height);
            
            // 获取像素数据
            const imageData = ctx.getImageData(0, 0, width, height);
            const pixels = imageData.data;
            
            // 图像预处理
            const processedPixels = this.preprocessImage(pixels, width, height);
            
            // 转换为黑白并生成SVG
            const svg = this.generateSVG(processedPixels, width, height);
            resolve(svg);
        });
    }

    // 图像预处理函数
    preprocessImage(pixels, width, height) {
        // 转换为灰度图
        const grayPixels = new Uint8ClampedArray(width * height);
        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            grayPixels[i / 4] = gray;
        }
        
        // 应用高斯模糊减少噪声
        const blurred = this.applyGaussianBlur(grayPixels, width, height);
        
        // 自适应阈值处理
        const threshold = this.calculateAdaptiveThreshold(blurred, width, height);
        
        // 二值化
        const binaryPixels = new Uint8ClampedArray(width * height);
        for (let i = 0; i < blurred.length; i++) {
            binaryPixels[i] = blurred[i] < threshold ? 0 : 255;
        }
        
        return binaryPixels;
    }

    // 高斯模糊
    applyGaussianBlur(pixels, width, height) {
        const kernel = [
            [1, 2, 1],
            [2, 4, 2],
            [1, 2, 1]
        ];
        const kernelSum = 16;
        
        const result = new Uint8ClampedArray(width * height);
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let sum = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const pixelIndex = (y + ky) * width + (x + kx);
                        sum += pixels[pixelIndex] * kernel[ky + 1][kx + 1];
                    }
                }
                result[y * width + x] = Math.round(sum / kernelSum);
            }
        }
        
        return result;
    }

    // 计算自适应阈值
    calculateAdaptiveThreshold(pixels, width, height) {
        let sum = 0;
        let count = 0;
        
        // 计算平均亮度
        for (let i = 0; i < pixels.length; i++) {
            sum += pixels[i];
            count++;
        }
        
        const mean = sum / count;
        
        // 计算标准差
        let variance = 0;
        for (let i = 0; i < pixels.length; i++) {
            variance += Math.pow(pixels[i] - mean, 2);
        }
        const stdDev = Math.sqrt(variance / count);
        
        // 使用用户可调节的阈值因子
        const threshold = mean - this.thresholdFactor * stdDev;
        return Math.max(30, Math.min(220, threshold));
    }

    generateSVG(pixels, width, height) {
        // 检测二维码模块大小
        const moduleSize = this.detectQRModuleSize(pixels, width, height);
        
        // 创建规整化的点阵
        const grid = this.createUniformGrid(pixels, width, height, moduleSize);
        
        // 生成美观的SVG
        return this.generateBeautifulSVG(grid, width, height, moduleSize);
    }

    // 检测二维码模块大小
    detectQRModuleSize(pixels, width, height) {
        // 首先尝试检测二维码的定位点
        const finderPatterns = this.detectFinderPatterns(pixels, width, height);
        
        if (finderPatterns.length >= 3) {
            // 基于定位点计算模块大小
            const moduleSize = this.calculateModuleSizeFromFinderPatterns(finderPatterns);
            if (moduleSize > 0) {
                return Math.max(2, Math.min(moduleSize, this.blockSize));
            }
        }
        
        // 使用改进的模块大小检测算法
        const detectedSize = this.detectOptimalModuleSize(pixels, width, height);
        // 始终使用检测得到的模块大小
        return Math.max(2, detectedSize);
    }

    // 检测最优模块大小
    detectOptimalModuleSize(pixels, width, height) {
        // 更保守的最大尺寸限制
        const maxSize = Math.min(6, Math.min(width, height) / 20); // 更保守的限制
        const minSize = 3; // 提高最小值
        let bestSize = minSize;
        let bestScore = 0;
        
        // 尝试不同的模块大小，找到最佳平衡点
        for (let size = minSize; size <= maxSize; size++) {
            const score = this.calculateModuleScore(pixels, width, height, size);
            if (score > bestScore) {
                bestScore = score;
                bestSize = size;
            }
        }
        
        // 确保模块大小不会导致网格过小或过大
        const gridWidth = Math.floor(width / bestSize);
        const gridHeight = Math.floor(height / bestSize);
        
        // 如果网格太小，增加模块大小
        if (gridWidth < 20 || gridHeight < 20) {
            const minRequiredSize = Math.min(width, height) / 20;
            bestSize = Math.max(bestSize, Math.ceil(minRequiredSize));
        }
        
        // 如果网格太大，减小模块大小
        if (gridWidth > 80 || gridHeight > 80) {
            const maxRequiredSize = Math.min(width, height) / 80;
            bestSize = Math.min(bestSize, Math.floor(maxRequiredSize));
        }
        
        return Math.max(minSize, Math.min(maxSize, bestSize));
    }

    // 计算模块质量分数
    calculateModuleScore(pixels, width, height, moduleSize) {
        const gridWidth = Math.floor(width / moduleSize);
        const gridHeight = Math.floor(height / moduleSize);
        
        // 更严格的网格大小要求
        if (gridWidth < 20 || gridHeight < 20) return 0;
        if (gridWidth > 80 || gridHeight > 80) return 0; // 更严格的网格大小限制
        
        let uniformBlocks = 0;
        let totalBlocks = 0;
        let contrastScore = 0;
        
        for (let gy = 0; gy < gridHeight; gy++) {
            for (let gx = 0; gx < gridWidth; gx++) {
                const startX = gx * moduleSize;
                const startY = gy * moduleSize;
                const endX = Math.min(startX + moduleSize, width);
                const endY = Math.min(startY + moduleSize, height);
                
                const blockWidth = endX - startX;
                const blockHeight = endY - startY;
                
                if (blockWidth < moduleSize * 0.8 || blockHeight < moduleSize * 0.8) continue;
                
                const density = this.calculateModuleDensity(pixels, startX, startY, blockWidth, blockHeight, width);
                const isUniform = density > 0.8 || density < 0.2;
                
                if (isUniform) {
                    uniformBlocks++;
                }
                
                // 计算对比度分数
                const contrast = Math.abs(density - 0.5) * 2;
                contrastScore += contrast;
                
                totalBlocks++;
            }
        }
        
        if (totalBlocks === 0) return 0;
        
        const uniformityScore = uniformBlocks / totalBlocks;
        const avgContrast = contrastScore / totalBlocks;
        
        // 综合评分：均匀性 + 对比度 + 尺寸合理性 + 网格大小合理性
        const sizeScore = Math.min(1, moduleSize / 5); // 进一步降低偏好尺寸
        const gridSizeScore = Math.max(0, 1 - Math.abs(gridWidth - 40) / 40) * Math.max(0, 1 - Math.abs(gridHeight - 40) / 40);
        
        return uniformityScore * 0.3 + avgContrast * 0.3 + sizeScore * 0.2 + gridSizeScore * 0.2;
    }

    // 检测二维码定位点
    detectFinderPatterns(pixels, width, height) {
        const patterns = [];
        const minPatternSize = Math.min(width, height) / 20;
        const maxPatternSize = Math.min(width, height) / 3;
        
        for (let y = 0; y < height - minPatternSize; y += 2) {
            for (let x = 0; x < width - minPatternSize; x += 2) {
                for (let size = minPatternSize; size <= maxPatternSize; size += 2) {
                    if (this.isFinderPattern(pixels, x, y, size, width, height)) {
                        patterns.push({ x, y, size });
                    }
                }
            }
        }
        
        return patterns;
    }

    // 检查是否为定位点模式
    isFinderPattern(pixels, startX, startY, size, width, height) {
        if (startX + size >= width || startY + size >= height) return false;
        
        const moduleSize = Math.floor(size / 7);
        if (moduleSize < 1) return false;
        
        // 检查7x7的定位点模式
        const pattern = [
            [1,1,1,1,1,1,1],
            [1,0,0,0,0,0,1],
            [1,0,1,1,1,0,1],
            [1,0,1,1,1,0,1],
            [1,0,1,1,1,0,1],
            [1,0,0,0,0,0,1],
            [1,1,1,1,1,1,1]
        ];
        
        let matchCount = 0;
        for (let py = 0; py < 7; py++) {
            for (let px = 0; px < 7; px++) {
                const x = startX + px * moduleSize;
                const y = startY + py * moduleSize;
                const pixelIndex = y * width + x;
                
                if (pixelIndex < pixels.length) {
                    const isBlack = pixels[pixelIndex] < 128;
                    const expectedBlack = pattern[py][px] === 1;
                    
                    if (isBlack === expectedBlack) {
                        matchCount++;
                    }
                }
            }
        }
        
        return matchCount > 40; // 至少80%匹配
    }

    // 从定位点计算模块大小
    calculateModuleSizeFromFinderPatterns(patterns) {
        if (patterns.length < 2) return 0;
        
        // 计算定位点之间的平均距离
        let totalDistance = 0;
        let count = 0;
        
        for (let i = 0; i < patterns.length; i++) {
            for (let j = i + 1; j < patterns.length; j++) {
                const dx = patterns[i].x - patterns[j].x;
                const dy = patterns[i].y - patterns[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                totalDistance += distance;
                count++;
            }
        }
        
        if (count === 0) return 0;
        
        const avgDistance = totalDistance / count;
        // 定位点之间的距离大约是21个模块
        return Math.floor(avgDistance / 21);
    }

    // 验证模块大小是否有效
    isValidModuleSize(pixels, width, height, size) {
        const sampleCount = Math.min(100, Math.floor((width * height) / (size * size)));
        let validCount = 0;
        
        for (let i = 0; i < sampleCount; i++) {
            const x = Math.floor(Math.random() * (width - size));
            const y = Math.floor(Math.random() * (height - size));
            
            if (this.isUniformBlock(pixels, x, y, size, size, width)) {
                validCount++;
            }
        }
        
        return validCount > sampleCount * 0.7; // 70%的块是均匀的
    }

    // 检查块是否均匀
    isUniformBlock(pixels, startX, startY, blockWidth, blockHeight, imageWidth) {
        let blackPixels = 0;
        let totalPixels = 0;
        
        for (let y = startY; y < startY + blockHeight; y++) {
            for (let x = startX; x < startX + blockWidth; x++) {
                const pixelIndex = y * imageWidth + x;
                if (pixelIndex < pixels.length) {
                    if (pixels[pixelIndex] < 128) {
                        blackPixels++;
                    }
                    totalPixels++;
                }
            }
        }
        
        const ratio = blackPixels / totalPixels;
        return ratio > 0.8 || ratio < 0.2; // 大部分是黑色或大部分是白色
    }

    // 创建规整化的点阵
    createUniformGrid(pixels, width, height, moduleSize) {
        const gridWidth = Math.ceil(width / moduleSize);
        const gridHeight = Math.ceil(height / moduleSize);
        const grid = [];
        
        // 使用自适应阈值
        const adaptiveThreshold = this.calculateAdaptiveThresholdForGrid(pixels, width, height, moduleSize);
        
        for (let gy = 0; gy < gridHeight; gy++) {
            grid[gy] = [];
            for (let gx = 0; gx < gridWidth; gx++) {
                const startX = gx * moduleSize;
                const startY = gy * moduleSize;
                const endX = Math.min(startX + moduleSize, width);
                const endY = Math.min(startY + moduleSize, height);
                
                // 计算该模块的像素密度
                const density = this.calculateModuleDensity(pixels, startX, startY, endX - startX, endY - startY, width);
                
                // 使用自适应阈值决定该模块是否为黑色
                grid[gy][gx] = density > adaptiveThreshold;
            }
        }
        
        return grid;
    }

    // 为网格计算自适应阈值
    calculateAdaptiveThresholdForGrid(pixels, width, height, moduleSize) {
        const densities = [];
        const gridWidth = Math.ceil(width / moduleSize);
        const gridHeight = Math.ceil(height / moduleSize);
        
        // 收集所有模块的密度
        for (let gy = 0; gy < gridHeight; gy++) {
            for (let gx = 0; gx < gridWidth; gx++) {
                const startX = gx * moduleSize;
                const startY = gy * moduleSize;
                const endX = Math.min(startX + moduleSize, width);
                const endY = Math.min(startY + moduleSize, height);
                
                const density = this.calculateModuleDensity(pixels, startX, startY, endX - startX, endY - startY, width);
                densities.push(density);
            }
        }
        
        if (densities.length === 0) return 0.5;
        
        // 计算密度的中位数作为阈值
        densities.sort((a, b) => a - b);
        const median = densities[Math.floor(densities.length / 2)];
        
        // 根据用户设置的阈值因子调整
        const baseThreshold = median;
        const adjustedThreshold = baseThreshold + (this.thresholdFactor - 0.5) * 0.3;
        
        return Math.max(0.1, Math.min(0.9, adjustedThreshold));
    }

    // 计算模块密度
    calculateModuleDensity(pixels, startX, startY, blockWidth, blockHeight, imageWidth) {
        let blackPixels = 0;
        let totalPixels = 0;
        
        for (let y = startY; y < startY + blockHeight; y++) {
            for (let x = startX; x < startX + blockWidth; x++) {
                const pixelIndex = y * imageWidth + x;
                if (pixelIndex < pixels.length) {
                    if (pixels[pixelIndex] < 128) {
                        blackPixels++;
                    }
                    totalPixels++;
                }
            }
        }
        
        return totalPixels > 0 ? blackPixels / totalPixels : 0;
    }

    // 生成美观的SVG
    generateBeautifulSVG(grid, width, height, moduleSize) {
        const gridWidth = grid[0].length;
        const gridHeight = grid.length;
        const spacing = this.spacing;
        const actualModuleSize = Math.min(width / gridWidth, height / gridHeight) * (1 - spacing);
        const gap = actualModuleSize * spacing;
        
        // 计算居中偏移
        const totalWidth = gridWidth * actualModuleSize + (gridWidth - 1) * gap;
        const totalHeight = gridHeight * actualModuleSize + (gridHeight - 1) * gap;
        const offsetX = (width - totalWidth) / 2;
        const offsetY = (height - totalHeight) / 2;
        
        let svgContent = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;
        
        // 白色背景
        svgContent += `<rect width="100%" height="100%" fill="white"/>`;
        
        // 根据样式类型生成不同的模块
        for (let gy = 0; gy < gridHeight; gy++) {
            for (let gx = 0; gx < gridWidth; gx++) {
                if (grid[gy][gx]) {
                    const x = offsetX + gx * (actualModuleSize + gap);
                    const y = offsetY + gy * (actualModuleSize + gap);
                    
                    svgContent += this.generateModule(x, y, actualModuleSize, this.styleType);
                }
            }
        }
        
        svgContent += '</svg>';
        
        return svgContent;
    }

    // 生成不同类型的模块
    generateModule(x, y, size, styleType) {
        const centerX = x + size / 2;
        const centerY = y + size / 2;
        const radius = size / 2;
        
        switch (styleType) {
            case 'circle':
                return `<circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="black"/>`;
                
            case 'square':
                return `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="black"/>`;
                
            case 'diamond':
                const points = [
                    `${centerX},${y}`,
                    `${x + size},${centerY}`,
                    `${centerX},${y + size}`,
                    `${x},${centerY}`
                ].join(' ');
                return `<polygon points="${points}" fill="black"/>`;
                
            case 'rounded':
            default:
                const cornerRadius = Math.max(1, size * 0.15);
                return `<rect x="${x}" y="${y}" width="${size}" height="${size}" 
                    rx="${cornerRadius}" ry="${cornerRadius}" fill="black"/>`;
        }
    }

    // 合并相邻的块
    mergeAdjacentBlocks(blocks) {
        if (blocks.length === 0) return blocks;
        
        const merged = [];
        const processed = new Set();
        
        for (let i = 0; i < blocks.length; i++) {
            if (processed.has(i)) continue;
            
            const currentBlock = blocks[i];
            let mergedBlock = { ...currentBlock };
            processed.add(i);
            
            // 查找可以合并的相邻块
            for (let j = i + 1; j < blocks.length; j++) {
                if (processed.has(j)) continue;
                
                const otherBlock = blocks[j];
                if (this.canMergeBlocks(mergedBlock, otherBlock)) {
                    mergedBlock = this.mergeTwoBlocks(mergedBlock, otherBlock);
                    processed.add(j);
                }
            }
            
            merged.push(mergedBlock);
        }
        
        return merged;
    }

    // 判断两个块是否可以合并
    canMergeBlocks(block1, block2) {
        const threshold = 2; // 允许的最大间隙
        
        // 检查是否在水平方向上相邻
        const horizontalAdjacent = 
            Math.abs(block1.y - block2.y) <= threshold &&
            Math.abs(block1.x + block1.width - block2.x) <= threshold &&
            block1.height === block2.height;
            
        // 检查是否在垂直方向上相邻
        const verticalAdjacent = 
            Math.abs(block1.x - block2.x) <= threshold &&
            Math.abs(block1.y + block1.height - block2.y) <= threshold &&
            block1.width === block2.width;
            
        return horizontalAdjacent || verticalAdjacent;
    }

    // 合并两个块
    mergeTwoBlocks(block1, block2) {
        const minX = Math.min(block1.x, block2.x);
        const minY = Math.min(block1.y, block2.y);
        const maxX = Math.max(block1.x + block1.width, block2.x + block2.width);
        const maxY = Math.max(block1.y + block1.height, block2.y + block2.height);
        
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    calculateBlockBrightness(pixels, startX, startY, blockWidth, blockHeight, imageWidth) {
        let totalBrightness = 0;
        let pixelCount = 0;
        
        for (let y = startY; y < startY + blockHeight; y++) {
            for (let x = startX; x < startX + blockWidth; x++) {
                const pixelIndex = y * imageWidth + x;
                
                // 对于预处理后的二值化图像，直接使用像素值
                if (pixelIndex < pixels.length) {
                    totalBrightness += pixels[pixelIndex];
                    pixelCount++;
                }
            }
        }
        
        return pixelCount > 0 ? totalBrightness / pixelCount : 255;
    }

    downloadSVG() {
        if (!this.svgData) {
            this.showStatus('没有可下载的SVG数据', true);
            return;
        }
        
        const blob = new Blob([this.svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'qrcode_vector.svg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        this.showStatus('SVG文件下载成功！');
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new QRCodeToVectorConverter();
});
