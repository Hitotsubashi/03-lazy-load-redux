## 何为 LazyLoad

`LazyLoad`，用中文来说就是**延迟加载**或**惰性加载**。即一个变量，在被调用的时候，才开始加载自身的内容。这样子可以避免首屏加载时间过长导致的体验不佳。在日常开发中，我们经常会用到`LazyLoad`。例如`React`中的[React.lazy](https://zh-hans.reactjs.org/docs/code-splitting.html#reactlazy)，以及`Vue2`中的[异步组件:()=>import('./SomeComponent')](https://cn.vuejs.org/v2/guide/components-dynamic-async.html#%E5%A4%84%E7%90%86%E5%8A%A0%E8%BD%BD%E7%8A%B6%E6%80%81)，都是用于实现组件的延迟加载。而今天这篇文章讨论的是实现`Redux`的状态（`State`）中非基础类型数据的延迟加载。

## `Redux Store`中使用延迟加载的好处

已知`Redux State`存储的都是公共变量，而某些公共变量是通过异步获取的，如果某个组件（此处以`React`组件进行讨论）在交互中需要前面所说的公共变量例如分组`groups`时，则需要保证这些公共变量在组件进行交互之前就已被加载。

`Redux State`的改变是通过`dispatch Action`而触发的。我们通常会把`dispatch Action`逻辑写在两处地方：

1. **写在组件的生命周期（`useEffect`或`componentDidMount`）中**。但存在一个 **_缺点_** ：存在多个组件用到`groups`之类的公共变量，则每个组件都要在相同的生命周期中派发相应的`action`，继而多处相同的逻辑会导致让我们的项目代码非常臃肿繁琐。

2. **写在入口文件中**。这样子可以弥补上面第 1 点的缺点，但也存在一个 **_缺点_** ：公共变量多的情况下会导致请求过多导致首屏加载时间变长（毕竟浏览器对同域名的请求有最大并发数的限制）。

而当我们使用延迟加载，且把延迟加载的逻辑写在与`Redux`相关的操作中时，就可以很好避免上面的情况。

<!-- 而且，无论是第一点还是第二点都面临一个问题，**不能保证`Redux State`中的状态是最新的**。我们来设定一个场景：在一个商品网站中，`Redux State`中存在一个存储标签的对象类型的变量`tags`，这个`tags`需要从后端获取，而每个商品都会被附上`tags`中的其中一个标签。而`tags`是会随着其他商家的新增标签而变化的，那么在不能保证`Redux State`中的`tags`和后端数据库中的`tags`保持一致的情况下，则会出现你浏览新商品时，会存在该商品的标签显示不全的情况。 -->

## 延迟加载的实现思路

接下来我们假设一个需求，在一个公司内部的网站（类似于工单管理系统）上，我们需要查询获取开发人员`users`的相关信息，而每个开发人员都属于一个**分组**中。记录这些**分组**的是一个存储在`Redux State`中的对象类型的变量`groups`。其数据关系如下：

- `users`: Array<{id:string, group_id:string,name:string}>

  `users`是指获取的开发人员列表，是一个数组，里面的元素都是一个包含三个属性：`id`，`group_id`，`name`的对象。其中`id`指该开发人员的唯一 ID，`group_id`指向分组的 ID，`name`指开发人员的名字。

- `groups`：{id:name}

  `groups`指分组信息，是一个对象。键`id`指分组的唯一`ID`，值`name`指分组的名字。

我们要把这个`groups`做到，在获取`users`且通过`table`组件展示到页面时，通过`user.group_id`从`groups`读取分组信息，继而引起`groups`异步加载数据更新自身。

// TODO 贴图片

### 1. 如何捕获读取行为

我们可以利用`ES6`中的[Proxy](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Proxy)去做到捕获读取行为。已知`Proxy`的初始化方式如下所示：

> const p = new Proxy(target, handler)

其中的参数如下：

- `target`：用`Proxy`包装的目标，必须是一个非基础类型的数据，例如数组、函数、对象。
- `handler`：一个定义读取代理函数的对象，里面的各种代理函数会在读写操作时触发执行。

我们把分组数据，也就是`groups`作为`target`，然后在`handler`中定义部分属性，然后把这两者作为`Proxy`构造函数的形参实例化出代理对象`groupProxy`。这个`groupProxy`赋予到`Redux state`中的`groups`变量上。如下图所示：

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/54f8af27aaf545c29b8a12ad562a3eda~tplv-k3u1fbpfcp-watermark.image)

现在着重说一下`handler`中哪些属性帮助我们可以捕捉那些常用的**读取行为**。注意此处我们只需关注于捕捉读取行为而不是写入行为。

1. `handler.has`：捕捉`in`行为，例如`"0" in groups`。
1. `handler.get`：捕捉读取行为，例如`groups["0"]`、`groups.hasOwnProperty("0")`。
1. `handler.ownKeys`：捕获`Object.keys`行为。

而`Object.values`和`Object.entries`会触发`handler.ownKeys`和`handler.get`的执行。

综上所述，当我们读取`Redux State`中的`groups`时，其实他是个`Proxy`实例，继而在读取操作中会触发我们在`handler`里定义的函数的执行。

### 2. 捕获读取行为后要怎么做

捕获读取行为后，由于
