import React, { useState } from "react";
import { connect } from "react-redux";
import { Table, Button, Space } from "antd";

const App = (props) => {
  const [users, setUsers] = useState([]);

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
