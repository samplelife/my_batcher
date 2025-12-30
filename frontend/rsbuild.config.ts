/**
 * Rsbuild 配置文件
 * 
 * Rsbuild 是一个基于 Rspack 的高性能构建工具，
 * 相比 Webpack 速度更快，配置更简单。
 */
import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";

export default defineConfig({
  plugins: [pluginReact()],
  
  // 输出配置
  output: {
    // 构建输出目录
    distPath: {
      root: "dist",
      js: "js",      // 直接输出到 dist/js/ 而不是 dist/static/js/
      css: "css",    // 直接输出到 dist/css/ 而不是 dist/static/css/
    },
    // 资源路径前缀 - 这很重要！
    // 因为我们的静态文件是通过 /mini-batcher/static/ 路径访问的
    assetPrefix: "/mini-batcher/static/",
    // 禁用文件名 hash，方便 setup.js 加载
    filename: {
      js: "[name].js",
      css: "[name].css",
    },
  },
  
  // 开发服务器配置
  dev: {
    // 开发时的端口
    assetPrefix: "/mini-batcher/static/",
  },
  
  // HTML 配置
  html: {
    // 不生成 HTML 文件，因为我们通过 setup.js 动态注入
    // 设置为 false 会导致构建失败，所以我们保留但不使用它
    title: "Mini Batcher",
  },
  
  // 源码配置
  source: {
    // 入口文件
    entry: {
      index: "./src/index.tsx",
    },
  },
});
