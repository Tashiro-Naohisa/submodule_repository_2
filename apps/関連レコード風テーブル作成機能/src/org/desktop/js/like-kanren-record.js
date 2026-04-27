/**
 * @fileoverview 関連レコード風テーブル表示機能
 *
 *【必要ライブラリ】
 * [JavaScript]
 * jquery.min.js
 * moment.min.js
 * snc.kintone-1.0.7-min.js
 * https://js.cybozu.com/font-awesome/v5.15.3/js/all.min.js
 *
 * [CSS]
 * https://js.cybozu.com/font-awesome/v5.15.3/css/fontawesome.min.css
 *
 * @author SNC
 * @version 1.0.2
 * @customer XXXXX (yyyy-mm-dd)
 */
jQuery.noConflict();
(function ($, sncLib, tblConfig) {
    'use strict';

    // コンフィグ情報
    const tblConfigs = tblConfig.config;
    // オフセット情報
    let offsets = {};

    /*-------------------------------------------------------------------------------------------------------------------*/

    /**
     * レコード編集画面の表示イベント
     * レコード詳細画面の表示イベント
     */
    kintone.events.on([
        'app.record.edit.show',
        'app.record.detail.show',
    ], function (event) {
        let record = event.record;

        // 関連レコード風テーブル数に応じて処理を設定
        for (let i = 0; i < tblConfigs.length; i++) {

            const tblConf = tblConfigs[i];
            const appId = tblConf.targetAppId;
            const tableId = tblConf.tableId;
            const pagerDivId = tableId + '_pager';
            const displayFields = tblConf.displayFields;
            // 取得上限 +1しているのは次ページがあるか判定する為
            const displayLimitPlus = tblConf.limit + 1;

            // 初期offsetを設定
            offsets[tableId] = 0;

            // テーブルスペース要素
            const elmTableSpace = kintone.app.record.getSpaceElement(tblConf.tableSpaceId);

            // 表示項目設定のth要素を生成
            let thColumn = '';
            for (let i = 0; i < displayFields.length; i++) {
                const disp = displayFields[i];
                thColumn += '<th class="kanrenTable-label"><span>' + disp.label + '</span></th>'
            }

            // 表示件数が0件の状態のテーブル要素を生成
            const colspanNum = displayFields.length + 1;
            let kanrenTable = $('<table class="kanrenTable">'
                + '          <thead><tr><th class="kanrenTable-label"></th>' + thColumn + '</tr></thead>'
                + '          <tbody id="' + tableId + '"><tr><td colspan="' + colspanNum + '">参照するレコードがありません。</td></tr></tbody>'
                + '        </table>'
                + '        <div id="' + pagerDivId + '">'
                + '          <a href="javascript:void(0)" title="前へ" class = "prev-page pager hidden">'
                + '            <i class=" fas fa-chevron-left fa-lg"></i>'
                + '          </a>'
                + '          <a href="javascript:void(0)" title="次へ" class = "next-page pager hidden">'
                + '            <i class=" fas fa-chevron-right fa-lg"></i>'
                + '          </a>'
                + '        </div>'
            );
            // テーブルをスペースへ追加
            $(elmTableSpace).append(kanrenTable);

            // 表示レコードの検索条件におけるクエリ生成
            const query = createQueryCondition(tblConf.query, record);
            // レコード取得
            kintone.Promise.all([
                sncLib.kintone.rest.getMultiRecord(appId, query, offsets[tableId], displayLimitPlus),
            ]).then(function (resp) {
                let records = resp[0];
                if (records.length !== 0) {
                    // 次ページ有無
                    if (records[tblConf.limit]) {
                        // 次ページアイコンを表示
                        $('.next-page', elmTableSpace).removeClass('hidden');
                        records.splice(tblConf.limit, 1);
                    };
                    // レコード表示用のテーブル部作成
                    createTbody(records, tblConf);
                };
            });

            /**
             * ページャー要素 クリック時のイベント処理
             */
            $('#' + pagerDivId + ' .pager').on('click', function () {
                let prevCheck = false;
                let offsetNum = 0;

                // 前へをクリック
                if ($(this).hasClass('prev-page')) {
                    // オフセット - displayLimit
                    offsetNum = offsets[tableId] - tblConf.limit;
                    // オフセットを再設定
                    offsets[tableId] = offsetNum;
                    prevCheck = true;
                }
                // 次へをクリック
                else {
                    // オフセット + displayLimit
                    offsetNum = offsets[tableId] + tblConf.limit;
                    // オフセットを再設定
                    offsets[tableId] = offsetNum;
                };

                // オフセット値を考慮したレコード取得処理
                sncLib.kintone.rest.getMultiRecord(appId, query, offsetNum, displayLimitPlus).then(function (resp) {
                    // 取得数0以外
                    if (resp.length) {
                        // 前へをクリック
                        if (prevCheck) {
                            // 次ページアイコンを表示
                            $('.next-page', elmTableSpace).removeClass('hidden');
                            resp.splice(tblConf.limit, 1);
                            if (offsetNum <= 0) {
                                // 前ページアイコンを非表示
                                $('.prev-page', elmTableSpace).addClass('hidden');
                            };
                        }
                        // 次へをクリック
                        else {
                            // 前ページアイコンを表示
                            $('.prev-page', elmTableSpace).removeClass('hidden');
                            // 次ページ有無
                            if (resp[tblConf.limit]) {
                                resp.splice(tblConf.limit, 1);
                            } else {
                                // 次ページアイコンを非表示
                                $('.next-page', elmTableSpace).addClass('hidden');
                            };
                        };
                        // レコード表示用のテーブル部作成
                        createTbody(resp, tblConf);
                    };
                });
            });
        }

        return event;
    });

    /**
     * 表示するレコードの条件をコンフィグからクエリ生成
     * @param {*} queryConfig テーブルのクエリコンフィグ
     * @param {*} record 取得レコード
     * @returns
     */
    function createQueryCondition(queryConfig, record) {

        let query = '';
        const conditions = queryConfig.conditions;
        const sortOrders = queryConfig.sortOrders;
        // クエリ条件を設定
        for (let i = 0; i < conditions.length; i++) {
            const cond = conditions[i];
            if (!record[cond.source]) {
                continue;
            }
            query = (query) ? query + ' ' + queryConfig.and_or + ' ' : query;

            switch (cond.type) {
                case 'TEXT':
                    if (cond.subtable) {
                        query = query + cond.target + ' in ("' + record[cond.source].value + '")';
                    } else {
                        query = query + cond.target + ' = "' + record[cond.source].value + '"';
                    }
                    break;
                default:
                    break;
            }
        }

        // ソート条件を設定
        let strOrder = '';
        if (sortOrders.length !== 0) {
            strOrder = 'order by ';
            for (let i = 0; i < sortOrders.length; i++) {
                const order = sortOrders[i];
                strOrder = (i === 0)
                    ? strOrder + order.fieldCode + ' ' + order.order
                    : strOrder + ', ' + order.fieldCode + ' ' + order.order;
            }
            query = query + ' ' + strOrder;
        }

        return query;
    }

    /**
     * 関連レコードテーブルのレコード作成処理
     * @param {*} records 取得レコード
     * @param {*} tblConf テーブルコンフィグ
     */
    function createTbody(records, tblConf) {

        const tableId = tblConf.tableId;
        const appId = tblConf.targetAppId;
        const displayFields = tblConf.displayFields;
        const elmTableSpace = kintone.app.record.getSpaceElement(tblConf.tableSpaceId);

        // tbodyの中を空にする
        $('#' + tableId, elmTableSpace).empty();

        // URL取得
        let defaultUrl = kintone.api.url('/k/v1/records.json');
        defaultUrl = defaultUrl.replace('v1/records.json', '');

        // 取得したデータをtbodyに表示
        for (let i = 0; i < records.length; i++) {
            // id取得
            const record = records[i]
            const recordId = record.$id.value;
            const url = defaultUrl + appId + '/show#record=' + recordId;

            // 詳細画面に遷移する要素を作成
            let tbodyValue = '<tr><td><a href=' + url + ' target="_blank" title="レコードの詳細を表示する"><i class="fas fa-file"></i></a></td>';

            // 設定されている表示項目の値を表示する要素を作成
            for (let i = 0; i < displayFields.length; i++) {

                const disp = displayFields[i];
                let displayValue = ''

                // サブテーブル内のフィールドかどうかを判定し、サブテーブルの場合は
                // サブテーブルにあるレコードすべてを値として表示する
                if (!disp.subtableCode) {
                    // 通常フィールド
                    displayValue = returnValue(record[disp.code]);
                } else {
                    let tableInFieldValues = [];
                    const tableValues = record[disp.subtableCode].value;
                    for (let j = 0; j < tableValues.length; j++) {
                        if (returnValue(tableValues[j].value[disp.code])) {
                            tableInFieldValues.push(returnValue(tableValues[j].value[disp.code]));
                        };
                    };
                    // 対象フィールドの値を1行ごとに改行させる
                    displayValue = tableInFieldValues.join('<br>');
                }
                // tbodyに入れる要素を作成
                // コンフィグの横幅指定がある場合は設定
                if (disp.width) {
                    tbodyValue += '<td style="width:' + disp.width + 'px; word-break: break-all;">' + displayValue + '</td>';
                } else {
                    tbodyValue += '<td>' + displayValue + '</td>';
                }

            };
            tbodyValue += '</tr>;'

            $('#' + tableId, elmTableSpace).append(tbodyValue);
        };
    };

    /**
     * 対象フィールドの値をフィールドタイプに応じてそれぞれ返す
     * @param {object} displayListCode
     * @return {String} displayValue フィールドの値
     */
    function returnValue(displayListCode) {
        let displayValue = '';
        // 設定されているフィールドの値を取得
        switch (displayListCode.type) {
            // 日時、更新日時フィールド
            case 'DATETIME':
            case 'UPDATED_TIME':
                let dateTimeValue = displayListCode.value;
                if (dateTimeValue) {
                    // 日時フィールドは取得時に値が変わってしまうためフォーマットを行い修正
                    let dateTimedateTime = moment(dateTimeValue).format('YYYY-MM-DD HH:mm');
                    displayValue = dateTimedateTime;
                };
                break;

            // チェックボックス、複数選択、カテゴリーフィールド
            case 'CHECK_BOX':
            case 'MULTI_SELECT':
            case 'CATEGORY':
                let checkBoxValue = '';
                // 値をカンマ区切りで連結
                checkBoxValue = displayListCode.value.join();
                displayValue = checkBoxValue;
                break;

            // ユーザー選択、組織選択フィールド
            case 'USER_SELECT':
            case 'ORGANIZATION_SELECT':
                let choiceValue = '';
                // 連想配列のnameを配列に代入
                choiceValue = displayListCode.value.map(item => item.name);
                // 値をカンマ区切りで連結
                choiceValue = choiceValue.join();
                displayValue = choiceValue;
                break;

            // 作成者、更新者、作業者、グループ選択フィールド
            case 'CREATOR':
            case 'MODIFIER':
            case 'STATUS_ASSIGNEE':
            case 'GROUP_SELECT':
                let name = displayListCode.value.name;
                if (name) {
                    displayValue = name;
                };
                break;

            // 添付ファイルフィールド
            case 'FILE':
                break;

            // 上記以外（文字列1行など）
            default:
                let value = displayListCode.value;
                if (value) {
                    displayValue = value;
                };
                break;
        };

        // エスケープ＋改行コード変換
        let escapeDispVal = $('<div>').text(displayValue).html().replace(/\n/g, '<br>');
        return escapeDispVal;
    };

})(jQuery, window.snc, window.tblConfig);
