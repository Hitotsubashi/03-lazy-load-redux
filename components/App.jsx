import React, { useState,useEffect } from "react";
import { connect } from "react-redux";
import { Table, Button, Space } from "antd";
import {fetchUsers} from '../apis'

const App = (props) => {
  const [users, setUsers] = useState([]);

  const getUsers = async()=>{
    const {users} = await fetchUsers()
    setUsers(users)
  }

  useEffect(() => {
    getUsers()
  }, [])

  const columns = [
    {
      title: "名字",
      dataIndex: "name",
      align: "center",
      width: 100,
    },
  ];
  return (
    <Space direction="vertical" style={{ margin: 12 }}>
      <Button type="primary">查询</Button>
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

export default App;
