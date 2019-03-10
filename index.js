const request = require('request-promise-native');
const fs = require('fs');
const path = require('path');
const extend = require('node.extend');


function logHandle(outErr) {

    let UTCTime = new Date().toUTCString();

    let filePath = path.join(__dirname, './errorLog.txt');

    fs.readFile(filePath, 'utf8', (err, data) => {

        if (err) {
            return fs.writeFile(filePath, UTCTime + '   ' + err.toString() + '\r\n\r\n', 'utf8', (err) => {
                if (err) {
                    throw err;
                }
            });
        }


        fs.writeFile(filePath, data + UTCTime + '   ' + outErr.toString() + '\r\n', 'utf8', (err) => {
            if (err) {
                throw err;
            }
        });

    });

}

function Crack(user, pwd) {

    this.user = user;
    this.pwd = pwd;

    // 计数
    this.count = 0;

}

/**
 * 请求地址,放在原型中存储
 * @type {{getCellListByTopicId: string, getTopicListByModuleId: string, getModuleListByClassId: string, getCourseList: string, login: string}}
 */
Crack.prototype.requestUri = {

    login: 'https://zjy2.icve.com.cn/newmobileapi/mobilelogin/newlogin',
    getCourseList: 'https://zjy2.icve.com.cn/newmobileapi/student/getCourseList',
    getModuleListByClassId: 'https://zjy2.icve.com.cn/newmobileapi/AssistTeacher/getModuleListByClassId',
    getTopicListByModuleId: 'https://zjy2.icve.com.cn/newmobileapi/AssistTeacher/getTopicListByModuleId',
    getCellListByTopicId: 'https://zjy2.icve.com.cn/newmobileapi/AssistTeacher/getCellListByTopicId',
    getCellInfoByCellId: 'https://zjy2.icve.com.cn/newmobileapi/AssistTeacher/getCellInfoByCellId',
    stuProcessCellLog: 'https://zjy2.icve.com.cn/newmobileapi/Student/stuProcessCellLog'

};

Crack.prototype.go = function () {

    let resultArray = [];

    let uri = this.requestUri;

    let nodeName = [
        'dataList',
        'moduleList',
        'topicList',
        'cellList',
        'cellChildNodeList',
        'cellInfo'
    ];

    let that = this;

    function handle(body, option) {

        // if (Object.prototype.toString.call(body) === '[object Array]') {
        //
        //     extend(body, body[0]);
        //
        // }

        let currentNode = '';

        let NodeHandle = {
            // 此函数调用了resolve
            dataList: function (body, option) {

                let arr = body.dataList;

                arr.forEach(item => {

                    let optionNew = {};

                    extend(optionNew, option);

                    optionNew.courseOpenId = item.courseOpenId;

                    optionNew.openClassId = item.openClassId;

                    request(that.createOptions(that.requestUri.getModuleListByClassId, optionNew))
                        .then(body => {
                            handle(body, optionNew);
                        })
                        .catch(logHandle);
                });

            },

            moduleList: function (body, option) {

                let arr = body.moduleList;

                arr.forEach(item => {

                    let optionNew = {};

                    extend(optionNew, option);

                    optionNew.moduleId = item.moduleId;

                    request(that.createOptions(that.requestUri.getTopicListByModuleId, optionNew))
                        .then(body => {
                            handle(body, optionNew);
                        })
                        .catch(logHandle);

                });

            },

            topicList: function (body, option) {

                let arr = body.topicList;

                arr.forEach(item => {

                    let optionNew = {};

                    extend(optionNew, option);

                    optionNew.topicId = item.topicId;

                    request(that.createOptions(that.requestUri.getCellListByTopicId, optionNew))
                        .then(body => {
                            if (body.cellList[0] === undefined) {
                                return false;
                            }
                            handle(body, optionNew);
                        })
                        .catch(logHandle);

                });

            },

            cellList: function (body, option) {

                let arr = body.cellList;

                let childNodeList = arr[0]['cellType'] === 1;

                if (childNodeList) {

                    /**
                     *
                     * 处理cellList里面直接是文档和视频的情况
                     *
                     */

                    return arr.forEach(item => {

                        let optionNew = {};

                        extend(optionNew, option);

                        optionNew.cellId = item.cellId;

                        request(that.createOptions(that.requestUri.getCellInfoByCellId, optionNew))
                            .then(body => {
                                handle(body, optionNew);
                            })
                            .catch(logHandle);
                    });

                }

                let optionNew = {};

                extend(optionNew, option);

                arr.forEach(item => {

                    handle(item, optionNew);

                });

            },

            cellChildNodeList: function (body, option) {

                let arr = body.cellChildNodeList;

                arr.forEach(item => {

                    let optionNew = {};

                    extend(optionNew, option);

                    optionNew.cellId = item.cellId;

                    request(that.createOptions(that.requestUri.getCellInfoByCellId, optionNew))
                        .then(body => {
                            handle(body, optionNew);
                        })
                        .catch(logHandle);

                });

            },

            cellInfo: function (body, option) {

                let arr = body.cellInfo;

                let optionNew = {};

                extend(optionNew, option);

                optionNew.token = arr.token;

                optionNew.cellLogId = arr.cellLogId;

                optionNew.cellId = arr.cellId;

                this.sendRecord(optionNew);

            },

            // 处理最终请求逻辑
            sendRecord: function (option) {

                option.sourceType = '2';
                option.picNum = '500';
                option.studyCellTime = '8888';
                option.studyNewlyTime = '0';
                option.studyNewlyPicNum = '0';

                request(that.createOptions(that.requestUri.stuProcessCellLog, option))
                    .then(body => {
                        if (body.code !== 1) {
                            return logHandle(new Error('发送结果时code不为1了，错了啊。' + JSON.stringify(body)));
                        }
                        that.count++;
                    })
                    .catch(logHandle);

            }

        };

        nodeName.forEach(item => {

            if (body[item]) {
                currentNode = item;
            }

        });

        switch (currentNode) {
            case 'dataList':
                NodeHandle.dataList(body, option);
                break;
            case 'moduleList':
                NodeHandle.moduleList(body, option);
                break;
            case 'topicList':
                NodeHandle.topicList(body, option);
                break;
            case 'cellList':
                NodeHandle.cellList(body, option);
                break;
            case 'cellChildNodeList':
                NodeHandle.cellChildNodeList(body, option);
                break;
            case 'cellInfo':
                NodeHandle.cellInfo(body, option);
                break;
        }


    }

    return new Promise((resolve, reject) => {

        let stuId = '';

        that.login()
            .then((body) => {
                stuId = body.token;
                if (body['code'] === -1) {
                    return reject(body['msg']);
                }
                return request(that.createOptions(that.requestUri.getCourseList, {
                    stuId: stuId
                }))
            })
            .then((body) => {

                if (!body) return false;

                resolve();

                handle(body, {
                    stuId: stuId
                })
            })
            .catch(logHandle);

    });

};

/**
 * @features 登录云课堂 返回stuId
 *
 * @parameter then(body) catch(err)
 *
 * @returns {Promise}
 *
 * @info { code: 1,
 * userType: 1,
 * token: 'hzruahepsjjhcdcunp4aiq',
 * userName: '1833333',
 * secondUserName: '',
 * userId: 'hzruahepsjjhcdcunp4aiq',
 * displayName: '格式',
 * url: 'http://zjy2.icve.com.cn/common/images/default_avatar.jpg',
 * schoolName: '2222222',
 * schoolId: 'ngmbah6neppm2xnzb1m7pq',
 * isValid: 1,
 * isNeedMergeUserName: 0,
 * pwd: '2222' }
 *
 */
Crack.prototype.login = function () {

    const that = this;

    return new Promise(function (resolve, reject) {

        request(that.createOptions(that.requestUri.login, {

            clientId: 'b42b6aae4c05c8f9516540d6d693fa82',
            sourceType: '2',
            userName: that.user,
            userPwd: that.pwd

        }))
            .then(function (body) {

                resolve(body);

            })
            .catch(function (err) {

                reject(err);

            });

    });

};

Crack.prototype.createOptions = (uri, option) => {

    if (Object.prototype.toString.call(uri) !== '[object String]' || Object.prototype.toString.call(option) !== '[object Object]') {
        throw 'parameter is error! need first parameter is String, last parameter is Object.';
    }

    return {
        method: 'GET',
        qs: option,
        uri: uri,
        json: true
    }

};



module.exports = (user, pwd) => {

    return new Promise((resolve, reject) => {

        let crack = new Crack(user, pwd);

        crack.go()
            .then(() => {
                process.on('exit', () => {
                    resolve(crack.count);
                });
            })
            .catch(msg => reject(msg));

    });

};

// example
/*
module.exports('18360427', 'hc13221930708')
.then(count => console.log(count))
.catch(msg => console.log(msg));*/
