## 1 何为 LazyLoad

`LazyLoad`，用中文来说就是**延迟加载**或**惰性加载**。即一个变量，在被调用的时候，才开始加载自身的内容。这样子可以避免首屏加载时间过长导致的体验不佳。在日常开发中，我们经常会用到`LazyLoad`。例如`React`中的[React.lazy](https://zh-hans.reactjs.org/docs/code-splitting.html#reactlazy)，以及`Vue2`中的[异步组件:()=>import('./SomeComponent')](https://cn.vuejs.org/v2/guide/components-dynamic-async.html#%E5%A4%84%E7%90%86%E5%8A%A0%E8%BD%BD%E7%8A%B6%E6%80%81)，都是用于实现组件的延迟加载。而今天这篇文章讨论的是实现`Redux`的状态（`State`）中非基础类型数据的延迟加载。

## 2 `Redux Store`中使用延迟加载的好处

已知`Redux State`存储的都是公共变量，而某些公共变量是通过异步获取的，如果某个组件（此处以`React`组件进行讨论）在交互中需要前面所说的公共变量例如分组`groups`时，则需要保证这些公共变量在组件进行交互之前就已被加载。

`Redux State`的改变是通过`dispatch Action`而触发的。我们通常会把`dispatch Action`逻辑写在两处地方：

1. **写在组件的生命周期（`useEffect`或`componentDidMount`）中**。但存在一个 **_缺点_** ：存在多个组件用到`groups`之类的公共变量，则每个组件都要在相同的生命周期中派发相应的`action`，继而多处相同的逻辑会导致让我们的项目代码非常臃肿繁琐。

2. **写在入口文件中**。这样子可以弥补上面第 1 点的缺点，但也存在一个 **_缺点_** ：公共变量多的情况下会导致请求过多导致首屏加载时间变长（毕竟浏览器对同域名的请求有最大并发数的限制）。

而当我们使用延迟加载，且把延迟加载的逻辑写在与`Redux`相关的操作中时，就可以很好避免上面的情况。

而且，无论是第一点还是第二点都面临一个**同步更新的问题**，即**不能保证`Redux State`中的状态是最新的**。我们来设定一个场景：在一个商品网站中，`Redux State`中存在一个存储标签的对象类型的变量`tags`，这个`tags`需要从后端获取，而每个商品都会被附上`tags`中的其中一个标签。而`tags`是会随着其他商家的新增标签而变化的，那么在不能保证`Redux State`中的`tags`和后端数据库中的`tags`保持一致的情况下，则会出现你浏览新商品时，会存在该商品的标签显示不全的情况。

针对上述问题，部分项目会采用轮询或者`websocket`通信来保证数据的一致性，可是这么写更是会增加项目的复杂度。

而此处用的延迟加载，也可以完美解决上面的**同步更新的问题**（这么说好像就不叫作延时加载了，不过其实是这个延时加载的思路顺便解决了这个**同步更新的问题**）。

## 3 延迟加载的实现思路

接下来我们假设一个需求，在一个公司内部的网站（类似于工单管理系统）上，我们需要查询获取开发人员`users`的相关信息，而每个开发人员都属于一个**分组**中。记录这些**分组**的是一个存储在`Redux State`中的对象类型的变量`groups`。其数据关系如下：

- `users`: ***Array<{id:string, group_id:string,name:string}>***

  `users`是指获取的开发人员列表，是一个数组，里面的元素都是一个包含三个属性：`id`，`group_id`，`name`的对象。其中`id`指该开发人员的唯一 ID，`group_id`指向分组的 ID，`name`指开发人员的名字。

- `groups`：***{id:name}***

  `groups`指分组信息，是一个对象。键`id`指分组的唯一`ID`，值`name`指分组的名字。

接下来要做到的效果时，当通过异步请求获取`users`且通过`table`组件展示到页面时，通过`user.group_id`从`groups`读取分组信息，继而引起`groups`异步加载数据更新自身。效果如下所示：

![redux-lazy-load.gif](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/0a522384615e487fb050efb0f06a41a3~tplv-k3u1fbpfcp-watermark.image)

### 3.1 如何捕获读取行为

我们可以利用`ES6`中的[Proxy](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Proxy)去做到捕获读取行为。已知`Proxy`的初始化方式如下所示：

> const p = new Proxy(target, handler)

其中实例化需要的参数如下：

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

### 3.2 捕获读取行为后要怎么做

捕获读取行为后，要分两种情况考虑：

1. **`Redux State`的`groups`中没有`user.group_id`对应的分组时**：即该`groups`没有加载或者数据和后台不一致。因此要做两件事：
  - 往后端发出请求获取`groups`。获取数据后生成新的`groupProxy`替换`Redux State`的`groups`。`Redux State`的变化会触发`React`组件重新渲染（`react-redux`库中的`connect`函数会让`React`组件在所注入的`State`变量更新时重新渲染），渲染过程中再次往`Redux State`的`groups`读取数据时，此时已有`user.group_id`对应的分组，就会发生下面第二点。
  - 往组件返回一个临时值。

2.  **`Redux State`的`groups`中有`user.group_id`对应的分组时**：则直接返回该分组。

综合上面的过程可有下面的流程图：

![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9c6e01796eca4294a7e2549ac195ffe3~tplv-k3u1fbpfcp-watermark.image)

## 4 用redux-thunk实现lazy-load

在本次需求中，后端有两个接口，一个是请求`users`的接口（`http://localhost:8888/users`），另一个是请求`groups`的接口（`http://localhost:8888/groups`）。后端的代码如下所示：

```js
var express = require('express')
var app = express()

// users数据
const USERS = [
  {
    id:'0',
    name:'用户A',
    group_id:'0'
  },
  {
    id:'1',
    name:'用户B',
    group_id:'0'
  },
  {
    id:'2',
    name:'用户C',
    group_id:'1'
  }
]

// groups数据
const GROUPS={
  '0':'分组A',
  '1':'分组C'
}

const PORT=8888

// 通过中间件解决浏览器的同源策略问题
app.use(function(req,res,next){
  // 响应头设置Access-Control-Allow-Origin字段
  res.header("Access-Control-Allow-Origin", "*");
  next()
})

app.get('/users', function (req, res) {
  res.send({users:USERS})
})

app.get('/groups', function (req, res) {
  // 此处设置延迟1s后才响应数据是为了能够明显地看到groups于users后加载的效果
  setTimeout(() => {
    res.send({groups:GROUPS})
  }, 1000);
})

app.listen(PORT)
```

我们接下来试一下用`redux-thunk`实现上面的逻辑。首先先展示请求函数

```js
export const fetchUsers = ()=>{
  return fetch('http://localhost:8888/users').then(res=>res.json())
}

const loading = false
export const fetchGroups = ()=>{
  return fetch('http://localhost:8888/groups').then(res=>res.json())
}
```

接下来重点看一下`store`的编写，首先看一下`action`中的内容：

**action**
```js
import {fetchGroups} from '../../apis'

// 设置Redux State中的groups
export const SET_GROUPS=(groups)=>({
  type:'SET_GROUPS',
  groups
})

// 生成groupProxy且派发SET_GROUPS
export const MAKE_GROUPS_PROXY = (groups)=>(dispatch)=>{
  const groupProxy = new Proxy(groups,{
    get(target, property){
      /**
       * 对property的类型和值进行校验，
       * 因为在打开chrome的redux-devtools进行调试时，redux-devtools会调用
       * groups的constructor和Symbol(Symbol.toStringTag)等进行监听更新，我们没必要处理
       * 那些处于原型链上的属性的调用，所以针对property进行类型校验看传入的是否为group_id
       */
      if(!(typeof property==='string'&&/\d+/.test(property))) return target[property]
      /**
       * 如果被代理的对象target中不存在该分组，则返回“加载中”作为临时值，且派发REQUEST_GROUPS()
       * 触发groups同步后端的数据
       */
      if(!(property in target)){
        dispatch(REQUEST_GROUPS())
        return '加载中'
      }
      // 如果被代理的对象target中存在该分组，则直接返回该值
      return target[property]
    }
  })
  dispatch(SET_GROUPS(groupProxy))
}

// 用于避免多个读取行为触发REQUEST_GROUPS多次执行
let loading = false
// 请求groups且派发MAKE_GROUPS_PROXY
export const REQUEST_GROUPS = ()=>async (dispatch) => { 
  if(loading) return
  loading = true
  const {groups} = await fetchGroups()
  loading = false
  dispatch(MAKE_GROUPS_PROXY(groups))
}
```

重点说一下`MAKE_GROUPS_PROXY`。他是一个纯函数，可是却写成`redux-thunk`中**异步`Action Creator`**的形式。是因为这里需要`store.dispatch`用于派发`SET_GROUPS`生成得`Action`。上面的`Action Creator`的派发流程如下所示：

![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/192506264b75451dad27f3826fb88461~tplv-k3u1fbpfcp-watermark.image)

然后看一下`reducer`的代码：

```js
const reducer = (state,action)=>{
  switch (action.type) {
    case 'SET_GROUPS':
      return {groups:action.groups}
    default:
      return state
  }
}

export default reducer
```

最后看生成`store`的逻辑：

```js
import { createStore,applyMiddleware } from 'redux'
import reducer from './reducer'
import thunk from 'redux-thunk'
import {MAKE_GROUPS_PROXY} from './action'

const store = createStore(reducer,{groups:{}}, applyMiddleware(thunk))
/** 
 * 派发MAKE_GROUPS_PROXY({})更新State中的groups，
 * 原本groups在上面的store初始化过程中设定为一个纯对象，此处要把他替换成代理实例
 */
store.dispatch(MAKE_GROUPS_PROXY({}))

export default store
```

最后在展示主页面逻辑：
**App.jsx**
```js
import React, { useState } from "react";
import { connect } from "react-redux";
import { Table, Button, Space } from "antd";
import {fetchUsers} from '../apis'
import {LoadingOutlined  } from '@ant-design/icons'

const App = (props) => {
  const {groups} = props
  const [users, setUsers] = useState([]);

  const getUsers = async()=>{
    const {users} = await fetchUsers()
    setUsers(users)
  }

  const columns = [
    {
      title: "名字",
      dataIndex: "name",
      align: "center",
      width: 100,
    },
    {
      title: "所属分组",
      dataIndex: "group_id",
      align: "center",
      width: 100,
      render:(group_id)=>groups[group_id]==='加载中'?<LoadingOutlined />:groups[group_id]
    },
  ];
  return (
    <Space direction="vertical" style={{ margin: 12 }}>
      <Button type="primary" onClick={getUsers}>查询</Button>
      <Table
        columns={columns}
        dataSource={users}
        bordered
        title={() => "人员信息"}
        rowKey="id"
      ></Table>
    </Space>
  );
};

const mapStateToProps = ({groups}) => ({
  groups
})

export default connect(mapStateToProps)(App);
```

就可以达到下面的效果：

![redux-lazy-load.gif](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/0a522384615e487fb050efb0f06a41a3~tplv-k3u1fbpfcp-watermark.image)

[项目地址](https://github.com/Hitotsubashi/03-lazy-load-redux)

## 5 用redux-saga实现lazy-load

当然，有些项目里用`redux-saga`而不是`redux-thunk`。因此，这里也提供`redux-saga`下实现`lazy-load`的做法。

不过要分析一下，`redux-saga`中把所有不纯的操作（即非纯函数）都要写成`saga`来处理。而我们是需要在`makeGroupProxy`（生成`group`的代理实例）的方法里，让`handler`中的`get`属性，在读取失败的情况下触发响应的`saga`执行。我们知道，外部触发`saga`执行通常就有`dispatch`相应的`action`了，而我们无法像`redux-thunk`一样在`makeGroupProxy`内部拿到`store.dispatch`。那么，还有另外一种方式让我们在外部触发`saga`执行吗？答案是有的：`eventChannel`。

之前写过一篇[文章](https://juejin.cn/post/6996879819472371719#heading-8)介绍`eventChannel`的用法，我这里就不再重复了。在这个的基础上，直接上`redux-saga`版本的`lazy-load`实现代码：

在上面的`redux-thunk`的代码中，我们不再需要`action`方面的代码，取而代之的是新建一个`saga`并在里面开始编写：

**saga**
```js
import { eventChannel, buffers } from 'redux-saga';
import {fetchGroups} from '../../apis'
import {call,take,put} from 'redux-saga/effects'

// trigger用于触发saga，在Proxy实例化过程中的handler里面调用
let trigger = null

export const makeGroupProxy = (target={})=>{
  return new Proxy(target, {
    get: (target, property) => {
      if(!(typeof property==='string'&&/\d+/.test(property))) return target[property]
      if (!(property in target)) {
        // 如果trigger是函数类型，则调用触发saga执行，继而触发groups的更新
        if (trigger instanceof Function) {
          trigger({});
        }
        return '加载中';
      }
      return target[property];
    }
  });
}

// 用于生成eventChannel
const makeRefreshGroupChannel = () => {
  return eventChannel((emitter) => {
    // emitter赋予给trigger
    trigger = emitter;
    return () => {};
    /**此处buffers.dropping(1)为1代表eventChannel通道的缓存里只允许接受外部事件源的数量为1
     * 这样子就可以避免多个读取事件失败时，emitter多次被调用导致请求groups重复 
     */
  }, buffers.dropping(1));
};

export function* watchGroupSaga(){
  // 生成eventChannel通道并监听
  const chan = yield call(makeRefreshGroupChannel);
  try {
    // 当trigger被调用时，进入while语句
    while (yield take(chan)) {
      const {groups} = yield call(fetchGroups);
      if (groups) {
        yield put({
          type: 'SET_GROUPS',
          // 生成groupProxy后更新到Redux State的groups上
          groups: makeGroupProxy(groups),
        });
      }
    }
  } finally {
    console.warn('watchGroup end.');
  }
}
```

最后在生成`store`的逻辑上对应改动：

```js
import { createStore,applyMiddleware } from 'redux'
import reducer from './reducer'
import createSagaMiddleware from "redux-saga";
import {makeGroupProxy,watchGroupSaga} from './saga'

const sagaMiddleware = createSagaMiddleware();
const store = createStore(reducer,{groups:makeGroupProxy({})}, applyMiddleware(sagaMiddleware))
// 执行watchGroupSaga开启对eventChannel的监听
sagaMiddleware.run(watchGroupSaga);

export default store
```

就只需还这两处，其余的代码和`redux-thunk`的一致，既可实现开头的gif例子中`groups`的懒加载。