/**
 * @fileoverview 関連レコード風テーブル表示機能
 * @author SNC
 * @version 1.0.1
 * @customer XXXXX（2021-11-25）
 */
(function (config) {
    'use strict';
    // グローバル変数
    window.tblConfig = window.tblConfig || {

        // 関連レコードテーブル設定情報（複数設定可）
        config: [
            // ==================================
            // 1つめの関連レコードテーブル用の設定
            // ==================================
            {
                // 参照先アプリId
                targetAppId: 407,
                // テーブル表示用のspaceId（※ユニーク値限定）
                tableSpaceId: 'anken_table_space',
                // テーブル表示用のtableId（※ユニーク値限定）
                tableId: 'anken_table_id',
                // テーブル表示項目設定
                // 添付ファイルフィールドは対象外
                displayFields: [
                    // label: カラムのラベル名,
                    // code: フィールドコード,
                    // subtableCode: サブテーブルのフィールドコード
                    // 　　　　　　　　対象カラムがサブテーブル内のフィールドの場合使用
                    // 　　　　　　　　サブテーブル内のフィールドではない場合はnullを指定
                    // width: 横幅（数値）
                    {
                        label: '発注者名',
                        code: '発注者名',
                        subtableCode: 'cf_発注担当者テーブル',

                    },
                    {
                        label: '部署',
                        code: '部署',
                        subtableCode: 'cf_発注担当者テーブル',

                    },
                    {
                        label: '肩書',
                        code: '肩書',
                        subtableCode: 'cf_発注担当者テーブル',
                        width: 50
                    },
                    {
                        label: '氏名',
                        code: '氏名',
                        subtableCode: 'cf_発注担当者テーブル',
                        width: 250
                    },
                    {
                        label: '備考',
                        code: '備考',
                        subtableCode: null,
                        width: 100
                    }
                ],
                // テーブル最大表示件数
                limit: 3,
                // 表示するレコードの条件（クエリ）
                // 複数指定可能
                // 現状、TEXTのフィールドタイプのみ指定可能
                query: {
                    conditions: [
                        // target : 検索対象フィールドコード
                        // source : 参照元値フィールドコード
                        // type : フィールドタイプ（TEXTのみ現状対応）
                        // subtable : サブテーブル内のフィールドかどうか
                        {
                            target: 'cf_発注担当者',
                            source: 'nok_キーマンID',
                            type: 'TEXT',
                            subtable: true
                        }
                    ],
                    // ソート条件（最大5つまで設定可能）
                    sortOrders: [
                        {
                            // 検索対象先アプリのフィールドコード
                            fieldCode: '$id',
                            order: 'desc',
                        },
                    ],
                    // and : すべての条件を満たす
                    // or: いずれかの条件を満たす
                    and_or: 'or',
                },
            },
            // ==================================
            // 2つめの関連レコードテーブル用の設定
            // ==================================
            {
                // 参照先アプリId
                targetAppId: 409,
                // テーブル表示用のspaceId（※ユニーク値限定）
                tableSpaceId: 'nippo_table_space',
                // テーブル表示用のtableId（※ユニーク値限定）
                tableId: 'nippo_table_id',
                // テーブル表示項目設定
                // 添付ファイルフィールドは対象外
                displayFields: [
                    // label: カラムのラベル名,
                    // code: フィールドコード,
                    // subtableCode: サブテーブルのフィールドコード
                    // 　　　　　　　　対象カラムがサブテーブル内のフィールドの場合使用
                    // 　　　　　　　　サブテーブル内のフィールドではない場合はnullを指定
                    // width: 横幅（数値）
                    {
                        label: '氏名',
                        code: 'cf_氏名',
                        subtableCode: 'cf_面談者テーブル',
                    },
                    {
                        label: '部署',
                        code: 'cf_部署',
                        subtableCode: 'cf_面談者テーブル',
                    },
                    {
                        label: '訪問目的',
                        code: 'nok_訪問目的',
                        subtableCode: null,
                    },
                ],
                // テーブル最大表示件数
                limit: 5,
                // 表示するレコードの条件（クエリ）
                // 複数指定可能
                // 現状、TEXTのフィールドタイプのみ指定可能
                query: {
                    conditions: [
                        // target : 検索対象フィールドコード
                        // source : 参照元値フィールドコード
                        // type : フィールドタイプ（TEXTのみ現状対応）
                        // subtable : サブテーブル内のフィールドかどうか
                        {
                            target: 'cf_発注担当者',
                            source: 'nok_キーマンID',
                            type: 'TEXT',
                            subtable: true
                        }
                    ],
                    // ソート条件（最大5つまで設定可能）
                    sortOrders: [
                        {
                            // 検索対象先アプリのフィールドコード
                            fieldCode: '$id',
                            order: 'desc',
                        },
                    ],
                    // and : すべての条件を満たす
                    // or: いずれかの条件を満たす
                    and_or: 'or',
                },
            },
        ]
    }
})(window.nokConfig);
