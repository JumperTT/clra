#!/usr/bin/env node

/**
 * CLRA Manifest 同步脚本
 * 用于GitHub Actions自动同步所有域名的manifest文件
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// 配置常量
const CONFIG_FILE = 'clra_urls.txt';
const CACHE_DIR = 'manifest-cache';
const DOMAINS_DIR = path.join(CACHE_DIR, 'domains');
const LOGS_DIR = path.join(CACHE_DIR, 'logs');
const MANIFEST_FILES = ['clra_manifest.json', 'jfkl_manifest.json'];
const RANDOM_STRING_LENGTH = 16;
const VALID_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';

// 全局状态
const state = {
    wildcardCache: new Map(),
    successCount: 0,
    failureCount: 0,
    errors: [],
    syncTime: new Date().toISOString()
};

/**
 * 生成随机字符串用于泛域名替换
 */
function generateRandomString(length = 16) {
    let result = '';
    for (let i = 0; i < length; i++) {
        result += VALID_CHARS.charAt(Math.floor(Math.random() * VALID_CHARS.length));
    }
    return result;
}

/**
 * 处理泛域名
 */
function processWildcard(domain) {
    if (!domain.includes('*')) {
        return domain;
    }

    if (state.wildcardCache.has(domain)) {
        return state.wildcardCache.get(domain);
    }

    const randomString = generateRandomString(RANDOM_STRING_LENGTH);
    const resolvedDomain = domain.replace(/\*/g, randomString);

    state.wildcardCache.set(domain, resolvedDomain);
    console.log(`泛域名解析: ${domain} -> ${resolvedDomain}`);

    return resolvedDomain;
}

/**
 * 生成缓存文件名（安全处理特殊字符）
 */
function getCacheFileName(domain) {
    return domain.replace(/[\\/:*?"<>|]/g, '_') + '.json';
}

/**
 * 拉取单个manifest文件
 */
async function fetchManifest(domain) {
    const processedDomain = processWildcard(domain);

    for (const filename of MANIFEST_FILES) {
        // 先尝试HTTPS
        try {
            const httpsUrl = `https://${processedDomain}/${filename}`;
            console.log(`尝试HTTPS: ${httpsUrl}`);

            const response = await fetch(httpsUrl, {
                timeout: 10000,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'CLRA-Sync-Bot/1.0'
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    console.log(`文件不存在(HTTPS): ${httpsUrl}`);
                    continue;
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const manifest = await response.json();
            console.log(`成功加载(HTTPS): ${domain} (${filename})`);
            return manifest;

        } catch (httpsError) {
            console.log(`HTTPS失败，尝试HTTP: ${httpsError.message}`);

            // 尝试HTTP
            try {
                const httpUrl = `http://${processedDomain}/${filename}`;
                console.log(`尝试HTTP: ${httpUrl}`);

                const response = await fetch(httpUrl, {
                    timeout: 10000,
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'CLRA-Sync-Bot/1.0'
                    }
                });

                if (!response.ok) {
                    if (response.status === 404) {
                        console.log(`文件不存在(HTTP): ${httpUrl}`);
                        continue;
                    }
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const manifest = await response.json();
                console.log(`成功加载(HTTP): ${domain} (${filename})`);
                return manifest;

            } catch (httpError) {
                console.log(`HTTP也失败: ${httpError.message}`);
                continue; // 尝试下一个文件名
            }
        }
    }

    throw new Error(`所有尝试都失败: ${domain}`);
}

/**
 * 验证manifest数据结构
 */
function validateManifest(manifest) {
    const requiredFields = ['name', 'developer', 'version', 'description'];

    for (const field of requiredFields) {
        if (!manifest[field]) {
            throw new Error(`缺少必需字段: ${field}`);
        }
    }

    // 验证数据类型
    if (typeof manifest.name !== 'string') throw new Error('name必须是字符串');
    if (typeof manifest.developer !== 'string') throw new Error('developer必须是字符串');
    if (typeof manifest.version !== 'string') throw new Error('version必须是字符串');
    if (typeof manifest.description !== 'string') throw new Error('description必须是字符串');

    return true;
}

/**
 * 保存manifest到缓存
 */
function saveManifestToCache(domain, manifest, processedDomain) {
    const cacheFileName = getCacheFileName(domain);
    const cacheFilePath = path.join(DOMAINS_DIR, cacheFileName);

    const cacheData = {
        ...manifest,
        _cache_meta: {
            original_domain: domain,
            processed_domain: processedDomain,
            sync_time: state.syncTime,
            sync_version: '1.0.0'
        }
    };

    fs.writeFileSync(cacheFilePath, JSON.stringify(cacheData, null, 2), 'utf8');
    console.log(`已保存缓存: ${cacheFileName}`);
}

/**
 * 保存同步日志
 */
function saveSyncLog() {
    const logFileName = `sync-${new Date().toISOString().split('T')[0]}.log`;
    const logFilePath = path.join(LOGS_DIR, logFileName);

    const logData = {
        sync_time: state.syncTime,
        success_count: state.successCount,
        failure_count: state.failureCount,
        wildcard_cache: Object.fromEntries(state.wildcardCache),
        errors: state.errors,
        summary: {
            total_domains: state.successCount + state.failureCount,
            success_rate: state.successCount / (state.successCount + state.failureCount) * 100
        }
    };

    fs.writeFileSync(logFilePath, JSON.stringify(logData, null, 2), 'utf8');
}

/**
 * 保存元数据
 */
function saveMetadata() {
    const metadataPath = path.join(CACHE_DIR, 'metadata.json');
    const domains = fs.readdirSync(DOMAINS_DIR)
        .filter(file => file.endsWith('.json'))
        .map(file => {
            const content = JSON.parse(fs.readFileSync(path.join(DOMAINS_DIR, file), 'utf8'));
            return {
                domain: content._cache_meta.original_domain,
                processed_domain: content._cache_meta.processed_domain,
                name: content.name,
                developer: content.developer,
                version: content.version,
                sync_time: content._cache_meta.sync_time
            };
        });

    const metadata = {
        last_sync: state.syncTime,
        total_tools: domains.length,
        domains: domains,
        wildcard_mappings: Object.fromEntries(state.wildcardCache)
    };

    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
}

/**
 * 主函数
 */
async function main() {
    console.log('=== CLRA Manifest 同步开始 ===');
    console.log(`开始时间: ${state.syncTime}`);

    try {
        // 读取域名配置
        const configContent = fs.readFileSync(CONFIG_FILE, 'utf8');
        const domains = configContent
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'));

        console.log(`读取到 ${domains.length} 个域名配置`);

        // 同步每个域名
        for (const domain of domains) {
            try {
                console.log(`\n处理域名: ${domain}`);

                const manifest = await fetchManifest(domain);
                validateManifest(manifest);

                const processedDomain = processWildcard(domain);
                saveManifestToCache(domain, manifest, processedDomain);

                state.successCount++;
                console.log(`✅ 成功同步: ${domain}`);

            } catch (error) {
                state.failureCount++;
                state.errors.push({
                    domain,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
                console.log(`❌ 同步失败: ${domain} - ${error.message}`);
            }
        }

        // 保存日志和元数据
        saveSyncLog();
        saveMetadata();

        // 输出同步结果
        console.log('\n=== 同步完成 ===');
        console.log(`成功: ${state.successCount}`);
        console.log(`失败: ${state.failureCount}`);
        console.log(`成功率: ${(state.successCount / (state.successCount + state.failureCount) * 100).toFixed(1)}%`);

        // 设置GitHub Actions输出
        if (process.env.GITHUB_OUTPUT) {
            const fs = require('fs');
            fs.appendFileSync(process.env.GITHUB_OUTPUT, `has_changes=${state.successCount > 0}\n`);
            fs.appendFileSync(process.env.GITHUB_OUTPUT, `success_count=${state.successCount}\n`);
            fs.appendFileSync(process.env.GITHUB_OUTPUT, `failure_count=${state.failureCount}\n`);
        }

    } catch (error) {
        console.error('同步过程出现严重错误:', error);
        process.exit(1);
    }
}

// 运行主函数
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main, fetchManifest, processWildcard };