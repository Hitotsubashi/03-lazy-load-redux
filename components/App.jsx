import React, { useState } from "react";
import { connect } from "react-redux";
import { Table, Button, Space } from "antd";
import {fetchUsers} from '../apis'

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
      render:(group_id)=>groups[group_id]
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
