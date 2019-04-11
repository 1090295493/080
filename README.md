# 使用指南

### example

+ 1.找到index.js最后3行代码，，如下，，把学号密码替换成你的

```javascript
module.exports('学号', '密码')
.then(count => console.log(count))
.catch(msg => console.log(msg));
```

+ 2.然后cd到当前代码目录，cmd执行如下代码

```javascript
npm install
npm run start
```