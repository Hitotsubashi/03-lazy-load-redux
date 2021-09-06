## 何为 LazyLoad

`LazyLoad`，用中文来说就是**延迟加载**或**惰性加载**。即一个变量，在被调用的时候，才开始加载自身的内容。这样子可以避免首屏加载时间过长导致的体验不佳。在日常开发中，我们经常会用到`LazyLoad`。例如`React`中的[React.lazy](https://zh-hans.reactjs.org/docs/code-splitting.html#reactlazy)，以及`Vue2`中的[异步组件:()=>import('./SomeComponent')](https://cn.vuejs.org/v2/guide/components-dynamic-async.html#%E5%A4%84%E7%90%86%E5%8A%A0%E8%BD%BD%E7%8A%B6%E6%80%81)，都是用于实现组件的延迟加载。而今天这篇文章讨论的是实现`Redux`的状态（`State`）中非基础类型数据的延迟加载。

## 实现`Redux Store`的懒加载的好处

已知`Redux State`存储的都是公共变量，而某些公共变量是通过异步获取的，如果某个组件（此处以`React`组件进行讨论）在交互中需要前面所说的公共变量例如`role`时，则需要保证这些公共变量在组件进行交互之前就已被加载。

`Redux State`的改变是通过`dispatch Action`而触发的。我们通常会把`dispatch Action`逻辑写在两处地方：

1. **写在组件的生命周期（`useEffect`或`componentDidMount`）中**。但存在一个 **_缺点_** ：存在多个组件用到`role`之类的公共变量，则每个组件都要在相同的生命周期中派发相应的`action`，继而多处相同的逻辑会导致让我们的项目代码非常臃肿繁琐。

2. **写在入口文件中**。这样子可以弥补上面第 1 点的缺点，但也存在一个 **_缺点_** ：公共变量多的情况下会导致请求过多导致首屏加载时间变长（毕竟浏览器对同域名的请求有最大并发数的限制）。

而且，无论是第一点还是第二点都面临一个问题，**不能保证`Redux State`中的状态是最新的**。我们来设定一个场景：在一个商品网站中，`Redux State`中存在一个存储标签的对象类型的变量`tags`，这个`tags`需要从后端获取，而每个商品都会被附上`tags`中的其中一个标签。而`tags`是会随着其他商家的新增标签而变化的，那么在不能保证`Redux State`中的`tags`和后端数据库中的`tags`保持一致的情况下，则会出现你浏览新商品时，会存在该商品的标签显示不全的情况。
