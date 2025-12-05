// src/index.tsx
// 入口文件：把 App 渲染到 index.html 中的 root 节点上

import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css"; // 引入全局样式
import App from "./App"; // 引入我们刚刚写的 App 组件

// 获取 public/index.html 中 id 为 "root" 的 DOM 节点
const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

// 使用 React.StrictMode 渲染 App 组件
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
