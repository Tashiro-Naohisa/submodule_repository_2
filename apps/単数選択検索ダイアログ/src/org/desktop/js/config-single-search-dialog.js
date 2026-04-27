/**
 * @fileoverview 単一ルックアップ検索ダイアログ 設定情報
 * @author SNC
 * @version 1.0.6
 * @customer XXXXX（2023-05-25）
 */
(function (config) {
    'use strict';
    // グローバル変数
    window.ssdConfig = window.ssdConfig || {
        dialogs: [
            // =============================
            // 1つ目のダイアログ設定
            // =============================
            {
                // ダイアログ要素生成コンテンツDIV要素ID（任意文字列、重複禁止）
                id: 'ssd_single_id_0',
                // 検索対象先AppId
                app: 1792,
                // 検索先アプリのデータ取得フィールドコード（※ユニーク値限定）
                sourceField: 'nok_顧客ID',
                // 自アプリのセット対象フィールドコード（ルックアップフィールド限定）
                targetField: 'nok_顧客検索',
                // 検索ダイアログの設定
                config: {
                    title: '顧客検索ダイアログ',     // タイトル
                    spaceId: 'modal_single_space_0', // ダイアログ要素作成用のスペースId
                    maxResults: 500,               // 最大取得件数
                    searchOpenDialog: false,        // 検索ダイアログ表示時に検索を行うかどうか
                    initQuery: '',                   // 初期条件のクエリ
                    defaultCondition: 'and',         // and/orで設定　デフォルト検索条件がand検索かor検索か
                    // 検索対象フィールドの設定
                    // キーは重複禁止
                    // キー（任意）: {
                    //  label:検索項目ラベル名
                    //  code:検索対象アプリ先のフィールドコード
                    //  type: フィールドタイプ　※2022/09/12 対象フィールドタイプはテキスト、ドロップダウン、日付
                    //  val: 選択肢（ドロップダウンの場合のみ使用、使用しない場合はnull）
                    //  init: 初期設定（使用しない場合はnull） {　
                    //    code: 自アプリのフィールドコード（テキストの場合のみ使用、使用しない場合はnull）
                    //    set: 初期設定値（ドロップダウンの場合のみ使用、使用しない場合はnull）
                    //    date: 指定期間（日付の場合のみ使用、使用しない場合はnull）
                    //        （yesterday, today, tomorrow, lastWeek, week, nextWeek, lastMonth, month, nextMonth, lastYear, year, nextYear）
                    //  }
                    // }
                    searchFieldConfig: {
                        kigyoumei: {
                            label: '顧客名',
                            code: 'nok_顧客名',
                            type: 'text',
                            val: null,
                            init: null,
                        },
                        jusho: {
                            label: '住所',
                            code: 'nok_顧客住所',
                            type: 'text',
                            val: null,
                            init: null,
                        },
                        yakushokukurasu: {
                            label: '顧客ランク',
                            code: 'nok_顧客ランク',
                            type: 'select',
                            val: [
                                'Aランク',
                                'Bランク',
                                'Cランク',
                                'Dランク',
                            ],
                            init: {
                                code: null,
                                set: [
                                ]
                            }
                        },
                        saishutaiobi: {
                            label: '最終対応日',
                            code: 'nok_最終対応日',
                            type: 'date',
                            val: null,
                            // init: { date: 'nextWeek' },
                        },
                    },
                    // 検索結果テーブルに表示されるフィールドの設定
                    // {
                    //  label:列名（任意）
                    //  code:フィールドコード
                    //  type:フィールドタイプを設定（https://developer.cybozu.io/hc/ja/articles/202166330-%E3%83%95%E3%82%A3%E3%83%BC%E3%83%AB%E3%83%89%E5%BD%A2%E5%BC%8F）
                    //  ※2021/11/19 対象外フィールドタイプは以下
                    //    FILE,SUBTABLE,REFERENCE_TABLE,CATEGORY,STATUS,STATUS_ASSIGNEE,
                    // }
                    showTableColumn: [
                        {
                            label: '顧客名',
                            code: 'nok_顧客名',
                            type: 'SINGLE_LINE_TEXT',
                        },
                        {
                            label: '住所',
                            code: 'nok_顧客住所',
                            type: 'SINGLE_LINE_TEXT',
                        },
                        {
                            label: 'TEL',
                            code: 'nok_TEL',
                            type: 'SINGLE_LINE_TEXT',
                        },
                        {
                            label: '顧客ランク',
                            code: 'nok_顧客ランク',
                            type: 'SINGLE_LINE_TEXT',
                        },
                    ],
                    // フッター部分に配置するオプションボタン設定
                    // 新規登録画面への遷移機能限定
                    // {
                    //  id:ボタンId（重複禁止）
                    //  appId:遷移先
                    //  label:ボタン表示名（任意）
                    //  target:他アプリ遷移後値セットフィールドコード（ルックアップフィールド限定）
                    //  source:自アプリ値参照フィールドコード
                    //  checkField:他アプリの戻り処理用チェックボックスフィールドコード
                    // }
                    optionBtn: [
                        {
                            id: 'kokyaku_create_btn',
                            appId: 1792,
                            label: '新規顧客作成',
                            target: 'nok_担当者検索',
                            source: 'nok_担当者ID',
                            checkField: 'nok_営業確認'
                        },
                    ]
                },
                // 検索ボタンの設定（ダイアログ表示用）
                btnConfig: {
                    // キー（任意）: {
                    //  spaceId:ボタン配置スペースId
                    //  id:ボタンId（重複禁止）
                    //  label:ボタン表示名（任意）
                    // }
                    searchBtn: {
                        spaceId: 'kokyaku_search_btn',
                        id: 'kokyakuSearchBtn',
                        label: '顧客検索'
                    }
                },
            },
            // =============================
            // 2つ目のダイアログ設定
            // =============================
            {
                // ダイアログ要素生成コンテンツDIV要素ID（任意文字列、重複禁止）
                id: 'ssd_single_id_1',
                // 検索対象先AppId
                app: 1791,
                // 検索先アプリのデータ取得フィールドコード（※ユニーク値限定）
                sourceField: 'nok_案件ID',
                // 自アプリのセット対象フィールドコード（ルックアップフィールド限定）
                targetField: 'nok_案件検索',
                // 検索ダイアログの設定
                config: {
                    title: '案件検索ダイアログ',     // タイトル
                    spaceId: 'modal_single_space_1', // ダイアログ要素作成用のスペースId
                    maxResults: 500,               // 最大取得件数
                    searchOpenDialog: false,        // 検索ダイアログ表示時に検索を行うかどうか
                    initQuery: '',                   // 初期条件のクエリ
                    defaultCondition: 'or',         // and/orで設定　デフォルト検索条件がand検索かor検索か
                    // 検索対象フィールドの設定
                    // キーは重複禁止
                    // キー（任意）: {
                    //  label:検索項目ラベル名
                    //  code:検索対象アプリ先のフィールドコード
                    //  type: フィールドタイプ　※2022/09/12 対象フィールドタイプはテキスト、ドロップダウン、日付
                    //  val: 選択肢（ドロップダウンの場合のみ使用、使用しない場合はnull）
                    //  init: 初期設定（使用しない場合はnull） {　
                    //    code: 自アプリのフィールドコード（テキストの場合のみ使用、使用しない場合はnull）
                    //    set: 初期設定値（ドロップダウンの場合のみ使用、使用しない場合はnull）
                    //    date: 指定期間（日付の場合のみ使用、使用しない場合はnull）
                    //        （yesterday, today, tomorrow, lastWeek, week, nextWeek, lastMonth, month, nextMonth, lastYear, year, nextYear）
                    //  }
                    // }
                    searchFieldConfig: {
                        kokyakumei: {
                            label: '顧客名',
                            code: 'nok_顧客名',
                            type: 'text',
                            val: null,
                            init: {
                                code: 'nok_顧客名',
                                set: null
                            },
                        },
                        ankenId: {
                            label: '案件ID',
                            code: 'nok_案件ID',
                            type: 'text',
                            val: null,
                        },
                        ankenmei: {
                            label: '案件名',
                            code: 'nok_案件名',
                            type: 'text',
                            val: null,
                        },
                        juchuyoteibi: {
                            label: '受注予定日',
                            code: 'nok_受注予定日',
                            type: 'date',
                            val: null,
                            // init: { date: 'nextWeek' },
                        },
                        kenshuyoteibi: {
                            label: '検収予定日',
                            code: 'nok_検収予定日',
                            type: 'date',
                            // init: { date: 'lastMonth' },
                        },
                    },
                    // 検索結果テーブルに表示されるフィールドの設定
                    // {
                    //  label:列名（任意）
                    //  code:フィールドコード
                    //  type:フィールドタイプを設定（https://developer.cybozu.io/hc/ja/articles/202166330-%E3%83%95%E3%82%A3%E3%83%BC%E3%83%AB%E3%83%89%E5%BD%A2%E5%BC%8F）
                    //  ※2021/11/19 対象外フィールドタイプは以下
                    //    FILE,SUBTABLE,REFERENCE_TABLE,CATEGORY,STATUS,STATUS_ASSIGNEE,
                    // }
                    showTableColumn: [
                        {
                            label: '顧客名',
                            code: 'nok_顧客名',
                            type: 'SINGLE_LINE_TEXT',
                        },
                        {
                            label: '案件ID',
                            code: 'nok_案件ID',
                            type: 'SINGLE_LINE_TEXT',
                        },
                        {
                            label: '案件名',
                            code: 'nok_案件名',
                            type: 'SINGLE_LINE_TEXT',
                        },
                        {
                            label: '担当者',
                            code: 'nok_担当者名',
                            type: 'SINGLE_LINE_TEXT',
                        },
                        {
                            label: '受注予定日',
                            code: 'nok_受注予定日',
                            type: 'DATE',
                            val: null,
                        },
                    ],
                    // フッター部分に配置するオプションボタン設定
                    // 新規登録画面への遷移機能限定
                    // {
                    //  id:ボタンId（重複禁止）
                    //  appId:遷移先
                    //  label:ボタン表示名（任意）
                    //  target:他アプリ遷移後値セットフィールドコード（ルックアップフィールド限定）
                    //  source:自アプリ値参照フィールドコード
                    //  checkField:他アプリの戻り処理用チェックボックスフィールドコード
                    // }
                    optionBtn: [
                        {
                            id: 'anken_create_btn',
                            appId: 1791,
                            label: '新規案件作成',
                            target: 'nok_顧客検索',
                            source: 'nok_顧客ID',
                            checkField: 'nok_営業確認'
                        },
                    ]
                },
                // 検索ボタンの設定（ダイアログ表示用）
                btnConfig: {
                    // キー（任意）: {
                    //  spaceId:ボタン配置スペースId
                    //  id:ボタンId（重複禁止）
                    //  label:ボタン表示名（任意）
                    // }
                    searchBtn: {
                        spaceId: 'anken_search_btn',
                        id: 'ankenSearchBtn',
                        label: '案件検索'
                    }
                },
            },
        ],

        // =============================
        // 共通設定
        // =============================

        messages: {
            'noResult': '対象レコードが存在しません',
            'errorGetRecord': 'レコードの取得に失敗しました',
            'leaveTheScreenEndOfTheSearch': '検索終了まで画面はそのままにしてください',
            'errorIncorrectDate': '日付の前後関係が正しくありません。',
        }
    }
})(window.nokConfig);
