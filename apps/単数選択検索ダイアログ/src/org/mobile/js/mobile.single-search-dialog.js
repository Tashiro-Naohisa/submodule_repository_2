/**
 * @fileoverview 単一ルックアップ検索ダイアログ（モバイル用）
 * 【バージョンアップ】
 *  1.0.1 複数ダイアログ設定追加
 *  1.0.2 検索結果のフィールドタイプによる値設定処理追加
 *  1.0.3 検索条件に日付フィールドを追加
 *  1.0.4 and/or条件切り替え機能追加
 *  1.0.5 初期条件設定機能
 *  1.0.6 修正対応：日付機能チェック、検索条件
 *
 * 【必要ライブラリ】
 * [JavaScript]
 * sweetalert2@9.js
 * jquery.min.js
 * jquery.tabslet.min.js
 * bootstrap-datepicker.min.js
 * bootstrap-datepicker.ja.min.js
 * popModal.min.js
 * luxon-3.1.1.min.js
 * snc.min.js -v1.0.5
 * snc.kintone.min.js -v1.0.8
 * snc.nok.min.js -v1.0.5
 *
 * [CSS]
 * 51-us-default.css
 * bootstrap-datepicker.standalone-1.8.0.min.css
 * popModal_cstm.css
 * single-search-dialog.css
 *
 * @author SNC
 * @version 1.0.6
 * @customer XXXXX（2023-05-25）
 *
*/
jQuery.noConflict();
(function ($, ssdConfig, sncLib) {
    'use strict';

    const dialogConfAry = ssdConfig.dialogs;
    const SSD_CONTENT_ID = 'single_search_dialog_content_';
    const messagesConfig = ssdConfig.messages;

    let search_param = {};

    /**
     * 新規登録レコード表示後イベント
     * 編集レコード表示後イベント
     */
    kintone.events.on([
        'mobile.app.record.create.show',
        'mobile.app.record.edit.show',
    ], function (event) {
        const record = event.record;

        // コンフィグで設定分のダイアログを作成
        for (let i = 0; i < dialogConfAry.length; i++) {
            const dialogConf = dialogConfAry[i];
            const dialogId = SSD_CONTENT_ID + dialogConf.id;
            const seachBtnConf = dialogConf.btnConfig.searchBtn;

            // 検索ボタン生成
            const btnSpace = kintone.mobile.app.record.getSpaceElement(seachBtnConf.spaceId);
            let searchBtn = document.createElement('button');
            searchBtn.id = seachBtnConf.id;
            searchBtn.className = 'button-custom';
            searchBtn.innerText = seachBtnConf.label;
            btnSpace.append(searchBtn);

            // 検索ダイアログを生成
            createDialog(dialogConf);

            // 検索ボタンクリック時のイベントを設定
            searchBtn.onclick = function () {
                // エリア空にする
                emptyDialogContentAndResultArea(dialogId);
                // ダイアログ表示
                showDialog(dialogId);

                // 検索項目の初期値設定
                setSearchItemDefaultValue(dialogId, dialogConf);

                if (dialogConf.config.searchOpenDialog) {
                    // 検索と結果表示
                    searchAndShowResult(dialogConf);
                }
            };

            // ダイアログ内検索ボタンの押下時イベント
            $(document).off('click', '.' + dialogId + ' .search_btn_dialog');
            $(document).on('click', '.' + dialogId + ' .search_btn_dialog', function () {
                // 検索と結果表示
                searchAndShowResult(dialogConf);
            });
        }

        return event;
    });

    /**
     * 対象アプリから検索条件に応じた検索を行い検索結果を表示する
     * @param {*} dialogConf
     * @returns
     */
    function searchAndShowResult(dialogConf) {
        const dialogId = SSD_CONTENT_ID + dialogConf.id;
        const searchCondErrors = [];

        // 取得件数・検索結果エリアを空にする
        emptyDialogContentAndResultArea(dialogId);

        // 検索中ダイアログ表示
        Swal.fire({
            title: '検索中'
            , html: messagesConfig.leaveTheScreenEndOfTheSearch
            , allowOutsideClick: false     //枠外をクリックしても画面を閉じない
            , showConfirmButton: false
            , onBeforeOpen: () => {
                Swal.showLoading();
            }
        });

        // 検索条件の設定
        search_param = {};
        setSearchCondition();

        // 検索条件にエラーが発生した場合、アラートを表示し処理を中断
        if (searchCondErrors.length > 0) {
            Swal.fire({
                title: 'Error'
                , icon: 'error'
                , html: createSearchConditionErrorMsg()
            });
            return false;
        }

        return new kintone.Promise(function (resolve, reject) {
            // 検索件数を取得
            resolve(getRecordTotalCount(dialogConf));
        }).then(function (res) {

            // 取得件数セット
            let count = '<span>全 ' + res + ' 件</span>';
            $(".count_area").append(count);

            // 検索結果の件数が設定値以上の場合
            if (res > 0 && res > dialogConf.config.maxResults) {
                Swal.fire({
                    title: 'warning'
                    , html: '検索結果が' + dialogConf.config.maxResults + '件を超えています。<br> 検索条件を入力して再度検索して下さい。'
                    , icon: 'warning'
                });
                return false;
            } else {
                // 検索対象レコードの取得
                return getSearchResultData(dialogConf);
            }
        }).then(function (resp) {
            if (!resp) {
                return false;
            }

            if (resp.length > 0) {
                // 検索結果テーブルの作成
                createResultTable(resp, dialogConf);
                Swal.close();
            } else {
                // 取得件数が0件の場合
                Swal.fire({
                    title: 'Info'
                    , html: messagesConfig.noResult
                    , icon: 'info'
                });
            }
        }).catch(function (err) {
            console.log(err);
            emptyDialogContentAndResultArea(dialogId);

            Swal.fire({
                title: 'Error'
                , html: messagesConfig.errorGetRecord + '<br>' + err.message
                , icon: 'error'
            });
            return false;
        });

        /**
         * 検索項目におけるエラーメッセージの作成
         * @returns
         */
        function createSearchConditionErrorMsg() {
            let errorMsg = '';
            for (let i = 0; i < searchCondErrors.length; i++) {
                const error = searchCondErrors[i];
                errorMsg = errorMsg + error.label + ':' + error.msg + '<br/>';
            }
            return errorMsg;
        }

        /**
         * 検索条件の設定
         */
        function setSearchCondition() {
            search_param = {};
            $.each(dialogConf.config.searchFieldConfig, function (index, value) {
                let dlgSearchContent = getDialogSearchContent(dialogId);
                if (dlgSearchContent) {
                    let searchField = $(dlgSearchContent).find('[name="' + index + '"]');

                    switch (value.type) {
                        case 'text':
                            search_param[index] = $(searchField).val();
                            break;
                        case 'select':
                            let vals = [];
                            for (let i = 0; i < searchField.length; i++) {
                                const opt = searchField[i];
                                if ($(opt).hasClass('kintoneplugin-dropdown-list-item-selected')) {
                                    vals.push(opt.innerText);
                                }
                            }
                            search_param[index] = vals;
                            break;
                        case 'date':
                            // luxonオブジェクトで日付処理を行う
                            const startField = $(dlgSearchContent).find('[name="' + index + '_start"]');
                            const endField = $(dlgSearchContent).find('[name="' + index + '_end"]');
                            const startVal = $(startField).val();
                            const endVal = $(endField).val();
                            const startDt = luxon.DateTime.fromSQL(startVal);
                            const endDt = luxon.DateTime.fromSQL(endVal);

                            // 日付の前後チェック
                            const diffDays = startDt.diff(endDt, 'days');
                            if (diffDays.values) {
                                if (diffDays.values.days > 0) {
                                    searchCondErrors.push({
                                        label: value.label,
                                        msg: messagesConfig.errorIncorrectDate
                                    })
                                }
                            }

                            // 開始日、終了日のどちらかに値が存在する場合に検索条件に設定
                            if (startVal || endVal) {
                                search_param[index] = {
                                    'sDate': startVal,
                                    'eDate': endVal,
                                }
                            } else {
                                search_param[index] = null;
                            }

                            break
                        default:
                            break;
                    }
                }
            });
        }
    }

    /**
     * 検索件数の取得
     * @param {*} dialogConf
     * @returns
     */
    function getRecordTotalCount(dialogConf) {
        let query = '';
        if (!isEmpty(search_param)) {
            query = createSearchConditionQuery(dialogConf);
        }
        // configの初期条件を先頭に追加
        if (dialogConf.config.initQuery) {
            if (query) {
                query = dialogConf.config.initQuery + ' and ' + query;
            } else {
                query = dialogConf.config.initQuery;
            }
        }
        // console.log(query);
        return sncLib.kintone.rest.getRecordsTotalCount(dialogConf.app, query);
    }

    /**
     * 検索結果の取得
     * @returns
     */
    function getSearchResultData(dialogConf) {
        let query = '';
        if (!isEmpty(search_param)) {
            query = createSearchConditionQuery(dialogConf);
        }
        // configの初期条件を先頭に追加
        if (dialogConf.config.initQuery) {
            if (query) {
                query = dialogConf.config.initQuery + ' and ' + query;
            } else {
                query = dialogConf.config.initQuery;
            }
        }
        // console.log(query);
        return sncLib.kintone.rest.getAllRecordsOnRecordId(dialogConf.app, query);
    }

    /**
     * 検索項目の初期値設定
     * @param {*} dialogId
     */
    function setSearchItemDefaultValue(dialogId, dialogConf) {
        let dlgSearchContent = getDialogSearchContent(dialogId);
        if (dlgSearchContent) {
            // 検索項目の初期値の設定
            $.each(dialogConf.config.searchFieldConfig, function (index, val) {
                // 設定が存在しない場合は処理をスキップ
                if (!val.init) {
                    return;
                }

                let searchField = $(dlgSearchContent).find('[name="' + index + '"]');
                switch (val.type) {
                    case 'text':    // テキストフィールド
                        let record = kintone.mobile.app.record.get();
                        let initVal = record.record[val.init.code].value;
                        $(searchField).val(initVal);
                        break;
                    case 'select':  // ドロップダウンフィールド
                        for (let i = 0; i < val.init.set.length; i++) {
                            const initVal = val.init.set[i];
                            for (let j = 0; j < searchField.length; j++) {
                                const opt = searchField[j];
                                if (initVal === opt.innerText) {
                                    $(opt).addClass('kintoneplugin-dropdown-list-item-selected');
                                }
                            }
                        }
                        break;
                    case 'date':    // 日付
                        const startField = $(dlgSearchContent).find('[name="' + index + '_start"]');
                        const endField = $(dlgSearchContent).find('[name="' + index + '_end"]');
                        // 設定値から開始日と終了日を取得
                        const dateObj = getStartEndDateSearchCondition(val.init.date);
                        $(startField).val(dateObj.sDate);
                        $(endField).val(dateObj.eDate);

                        // 期間指定の選択肢設定
                        const selectTermField = $(dlgSearchContent).find('[name="' + index + '_term_select"]');
                        $(selectTermField).val(val.init.date);
                        break;
                    default:
                        break;
                }
            });

            // 日付検索項目におけるdatepicker設定
            $(dlgSearchContent).find('.search_date').datepicker({
                format: 'yyyy-mm-dd',
                language: 'ja',
                autoclose: true,
            });

            // 日付検索項目の期間指定におけるイベント設定
            const selectTermField = $(dlgSearchContent).find('.term_select');
            $(selectTermField).on('change', function () {
                let value = $(this).val()
                let index = $(this).attr('name').slice(0, $(this).attr('name').lastIndexOf('_term_select'));

                const startField = $(dlgSearchContent).find('[name="' + index + '_start"]');
                const endField = $(dlgSearchContent).find('[name="' + index + '_end"]');
                if (value) {
                    let dateObj = getStartEndDateSearchCondition(value);
                    $(startField).val(dateObj.sDate);
                    $(endField).val(dateObj.eDate);
                } else {
                    $(startField).val("");
                    $(endField).val("");
                }
            });

            /**
             * 指定期間の開始日と終了日を取得
             * @param {*} condTerm
             * @returns
             */
            function getStartEndDateSearchCondition(condTerm) {

                let dateObj = {
                    sDate: null,
                    eDate: null
                }

                let taregtTerm = {
                    unit: null,
                    duration: null,
                    plusMinus: 0
                };

                // 指定期間の設定
                switch (condTerm) {
                    case 'yesterday':
                    case 'today':
                    case 'tomorrow':
                        taregtTerm.unit = 'days';
                        taregtTerm.duration = { days: 1 };
                        if (condTerm === 'yesterday') {
                            taregtTerm.plusMinus = -1;
                        }
                        if (condTerm === 'tomorrow') {
                            taregtTerm.plusMinus = 1;
                        }
                        break;
                    case 'lastWeek':
                    case 'week':
                    case 'nextWeek':
                        taregtTerm.unit = 'week';
                        taregtTerm.duration = { weeks: 1 };
                        if (condTerm === 'lastWeek') {
                            taregtTerm.plusMinus = -1;
                        }
                        if (condTerm === 'nextWeek') {
                            taregtTerm.plusMinus = 1;
                        }
                        break;
                    case 'lastMonth':
                    case 'month':
                    case 'nextMonth':
                        taregtTerm.unit = 'month';
                        taregtTerm.duration = { months: 1 };
                        if (condTerm === 'lastMonth') {
                            taregtTerm.plusMinus = -1;
                        }
                        if (condTerm === 'nextMonth') {
                            taregtTerm.plusMinus = 1;
                        }
                        break;
                    case 'lastYear':
                    case 'year':
                    case 'nextYear':
                        taregtTerm.unit = 'year';
                        taregtTerm.duration = { years: 1 };
                        if (condTerm === 'lastYear') {
                            taregtTerm.plusMinus = -1;
                        }
                        if (condTerm === 'nextYear') {
                            taregtTerm.plusMinus = 1;
                        }
                        break;
                    default:
                        break;
                }

                // 開始日と終了日の設定
                if (taregtTerm.plusMinus > 0) {
                    dateObj.sDate = luxon.DateTime.utc().plus(taregtTerm.duration).startOf(taregtTerm.unit).toFormat('yyyy-MM-dd');
                    dateObj.eDate = luxon.DateTime.utc().plus(taregtTerm.duration).endOf(taregtTerm.unit).toFormat('yyyy-MM-dd');
                } else if (taregtTerm.plusMinus < 0) {
                    dateObj.sDate = luxon.DateTime.utc().minus(taregtTerm.duration).startOf(taregtTerm.unit).toFormat('yyyy-MM-dd');
                    dateObj.eDate = luxon.DateTime.utc().minus(taregtTerm.duration).endOf(taregtTerm.unit).toFormat('yyyy-MM-dd');
                } else {
                    dateObj.sDate = luxon.DateTime.utc().startOf(taregtTerm.unit).toFormat('yyyy-MM-dd');
                    dateObj.eDate = luxon.DateTime.utc().endOf(taregtTerm.unit).toFormat('yyyy-MM-dd');
                }

                return dateObj;
            }
        }
    }

    /**
     * 検索条件に応じたクエリを生成
     * @returns
     */
    function createSearchConditionQuery(configDialog) {
        const searchConfig = configDialog.config.searchFieldConfig;
        const searchCondition = $('input:radio[name="searchCondition"]:checked').val();
        let query = '';
        for (const key in search_param) {
            if (search_param[key] && searchConfig[key]) {
                // フィールドタイプによってクエリ記法を変更
                switch (searchConfig[key].type) {
                    case 'text':
                        query += '(' + searchConfig[key].code + ' like "' + search_param[key] + '")';
                        break;
                    case 'select':
                        let keywords = search_param[key];
                        if (keywords.length === 0)
                            continue;

                        let joinKeyword = '';
                        for (let i = 0; i < keywords.length; i++) {
                            const keyword = keywords[i];
                            joinKeyword += '"' + keyword + '",';
                        }
                        joinKeyword = joinKeyword.substring(0, joinKeyword.lastIndexOf(','));

                        query += '(' + searchConfig[key].code + ' in (' + joinKeyword + '))';
                        break;
                    case 'date':
                        let dateCondition = '';
                        // 開始日の設定
                        if (search_param[key].sDate) {
                            dateCondition += searchConfig[key].code + ' >= "' + search_param[key].sDate + '"';
                        }
                        // 終了日の設定
                        if (search_param[key].eDate) {
                            if (dateCondition) {
                                dateCondition += ' and ';
                            }
                            dateCondition += searchConfig[key].code + ' <= "' + search_param[key].eDate + '"';
                        }
                        if (dateCondition) {
                            query += '(' + dateCondition + ')';
                        }
                        break;
                    default:
                        break;
                }
                query += ' ' + searchCondition + ' ';
            }
        }
        // 末尾のand/orを削除
        query = query.substring(0, query.lastIndexOf(' ' + searchCondition + ' '));

        return query;
    }

    /**
     * 検索ダイアログを表示する
     */
    function showDialog(dialogId) {
        $('#' + dialogId).dialogModal({
            topOffset: 0,
            top: '20%',
            type: '',
            onOkBut: function () { },
            onCancelBut: function () { },
            onLoad: function (el, current) { },
            onClose: function () { },
            onChange: function (el, current) { }
        });
    }

    /**
     * 検索ダイアログを閉じる
     */
    function closeModal() {
        var c = $(".dialogModal");
        c.removeClass("open");
        setTimeout(function () {
            c.remove();
            $("body").removeClass("dialogModalOpen").css({
                paddingRight: ""
            });
            $("html.dialogModalOpen").off(".dialogModalEvent").removeClass("dialogModalOpen");
            c.find(".dialogPrev").off("click");
            c.find(".dialogNext").off("click")
        }, 100)
    }

    /**
     * 検索ダイアログの中身を生成する
     */

    function createDialog(dialogConf) {
        // 検索ダイアログの設定情報
        const configDialog = dialogConf.config;
        const dialogId = SSD_CONTENT_ID + dialogConf.id;
        // ダイアログのコンテンツ部分を作成
        let myDialogSpace = kintone.mobile.app.record.getSpaceElement(configDialog.spaceId);
        // ダイアログのand条件/or条件初期値
        const defaultCondition = dialogConf.config.defaultCondition;
        $(myDialogSpace).append(createDialogContent(dialogId, configDialog, defaultCondition));
        // ダイアログのフッター部分を作成
        $('#' + dialogId + ' .dialogModal_footer').append(createDialogFooter(dialogConf));

        // 検索項目の作成
        let search_area = '';
        $.each(configDialog.searchFieldConfig, function (index, config) {
            let strSearch = '<tr>'
                + '            <td class="search_title">' + config.label + '</td>'
                + '            <td class="search_input_td">';
            switch (config.type) {
                case 'text':    // テキスト検索用項目作成
                    strSearch += '<div class="kintoneplugin-input-outer">'
                        + '         <input type="text" class="kintoneplugin-input-text search_input ' + index + '"'
                        + '          name="' + index + '">'
                        + '       </div>';
                    break;
                case 'select':  // ドロップダウン検索用の複数選択項目作成
                    strSearch += '<div class="kintoneplugin-dropdown-list">'
                    if (config.val) {
                        // 複数選択の選択肢を設定
                        for (let i = 0; i < config.val.length; i++) {
                            // 選択肢要素作成
                            strSearch += '<div class="kintoneplugin-dropdown-list-item " name="' + index + '">'
                                + '         <span class="kintoneplugin-dropdown-list-item-name">' + config.val[i] + '</span>'
                                + '       </div>';
                        }

                        if (config.val.length > 0) {
                            // 選択肢を押下した場合のイベント設定
                            $(document).on('click', '.single_search_dialogModal_content .search_table div[name="' + index + '"]', function () {
                                if ($(this).hasClass('kintoneplugin-dropdown-list-item-selected')) {
                                    $(this).removeClass('kintoneplugin-dropdown-list-item-selected');
                                } else {
                                    $(this).addClass('kintoneplugin-dropdown-list-item-selected');
                                }
                            });
                        }
                    }
                    strSearch += '</div>';
                    break;
                case 'date':    // 日付検索項目作成
                    strSearch += createSearchDateItem(index);
                    break;
                default:
                    break;
            }
            strSearch += '    </td>'
                + '         </tr>';

            search_area += strSearch;
        });

        if (search_area) {
            $('#' + dialogId + ' .search_table').append(search_area);
        }

        /**
         * 日付検索項目の生成
         * @param {*} index
         * @returns
         */
        function createSearchDateItem(index) {
            return '<div class="parent_search_date">'
                + '     <div class="kintoneplugin-select-outer">'
                + '         <div class="kintoneplugin-select">'
                + '             <select id="' + index + '_term_select" class="term_select" name="' + index + '_term_select">'
                + '                 <option value="">---</option>'
                + '                 <option value="yesterday">昨日</option>'
                + '                 <option value="today">今日</option>'
                + '                 <option value="tomorrow">明日</option>'
                + '                 <option value="lastWeek">先週</option>'
                + '                 <option value="week">今週</option>'
                + '                 <option value="nextWeek">来週</option>'
                + '                 <option value="lastMonth">先月</option>'
                + '                 <option value="month">今月</option>'
                + '                 <option value="nextMonth">来月</option>'
                + '                 <option value="lastYear">昨年</option>'
                + '                 <option value="year">今年</option>'
                + '                 <option value="nextYear">来年</option>'
                + '             </select>'
                + '         </div>'
                + '     </div>'
                + '     <div class="kintoneplugin-input-outer">'
                + '         <input id="' + index + '_start" type="text" class="kintoneplugin-input-text search_input search_date ' + index + '"'
                + '         name="' + index + '_start">'
                + '     </div>'
                + '     <div class="separate_date"><span> ～ </span></div>'
                + '     <div class="kintoneplugin-input-outer">'
                + '         <input id="' + index + '_end" type="text" class="kintoneplugin-input-text search_input search_date ' + index + '"'
                + '         name="' + index + '_end">'
                + '     </div>'
                + ' </div>';
        }
    }

    /**
     * 検索ダイアログのコンテンツを生成する
     * @returns コンテンツ内容
     */
    function createDialogContent(id, configDialog, defaultCondition) {
        let radio_and = 'checked';
        let radio_or = '';
        if (defaultCondition !== 'and') {
            radio_and = '';
            radio_or = 'checked';
        }
        return '<div id="' + id + '" class="dialog_content" style="display:none;">'
            + '   <div class="dialogModal_header single_search_dialogModal_header">' + configDialog.title + '</div>'
            + '   <div class="dialogModal_content single_search_dialogModal_content ' + id + '">'
            // 検索項目の生成用テーブル
            + '     <table class="search_table"></table>'
            + '     <div class="search_conditions_div">'
            + '       <div>'
            + '         <label>'
            + '           <input type="radio" name="searchCondition" value="and" id="radio-and" style="transform:scale(1.0); accent-color:#3498db;"' + radio_and + '> すべての条件を満たす'
            + '         </label>'
            + '       </div>'
            + '       <div>'
            + '         <label>'
            + '           <input type="radio" name="searchCondition" value="or" id="radio-or" style="transform:scale(1.0); accent-color:#3498db;"' + radio_or + '> いずれかの条件を満たす'
            + '         </label>'
            + '       </div>'
            + '     </div>'
            + '     <div class="search_button_div">'
            + '       <button class="kintoneplugin-button-normal search_btn_dialog" >検索</button>'
            + '     </div>'
            + '     <div class="count_area"></div>'
            + '     <div class="list_table_wrapper">'
            // 検索結果の生成用テーブル
            + '       <table class="result_table">'
            + '       </table>'
            + '     </div>'
            + '   </div>'
            + '   <div class="dialogModal_footer">'
            + '   </div>'
            + '</div>';
    };

    /**
     * ダイアログのフッター部分の生成
     * 別画面遷移オプションボタンなど
     */
    function createDialogFooter(dialogConf) {
        const optionBtns = dialogConf.config.optionBtn;
        let footer = '';
        for (let i = 0; i < optionBtns.length; i++) {
            const btnConf = optionBtns[i];
            footer += '<button id="' + btnConf.id + '" class="' + btnConf.id
                + ' kintoneplugin-button-normal" data-dialogmodal-but="touroku" type="button">' + btnConf.label + '</button>';

            // ボタン押下時のイベント設定
            $(document).on('click', '#' + btnConf.id, function () {
                let fieldRecord = kintone.mobile.app.record.get();
                let tab = window.open('/k/m/' + btnConf.appId + '/edit');

                // モバイル版では画面遷移後のレコード取得が出来ないため
                // 現状は画面遷移処理のみ対応

                // ダイアログを閉じる
                closeModal();
            });
        }

        // キャンセルボタン
        footer += '<button class="btn btn-default kintoneplugin-button-normal" data-dialogmodal-but="cancel" type="button">キャンセル</button>'
        return footer;
    }

    /**
     * 検索結果テーブル生成
     * @param {*} data
     * @param {*} dialogConf
     */
    function createResultTable(data, dialogConf) {
        const dialogId = SSD_CONTENT_ID + dialogConf.id;
        const showTableColumnsConf = dialogConf.config.showTableColumn;
        const targetField = dialogConf.targetField;

        // ヘッダーの生成
        let strHeader = '<thead>'
            + '            <tr align="left">'
            + '              <th></th>';
        for (let i = 0; i < showTableColumnsConf.length; i++) {
            const column = showTableColumnsConf[i];
            strHeader += '<th class="' + column.code + '">' + column.label + '</th>';
        }
        strHeader += '     </tr>';
        strHeader += '   </thead>';
        $('.result_table').append(strHeader);

        // ボディの生成
        let strBody = '<tbody id="list_tbody" >';
        for (let i = 0; i < data.length; i++) {
            let currentData = data[i];

            // 1列目の選択行追加
            strBody += '<tr class="table_cont">'
                + '       <td class="td align select_btn">'
                + '         <input type="button" class="select_result_record_btn" value="選択" data-select="' + currentData[dialogConf.sourceField].value + '">'
                + '       </td>';

            // コンフィグで設定された検索結果を表示するフィールドを追加
            for (let y = 0; y < showTableColumnsConf.length; y++) {
                const column = showTableColumnsConf[y];
                let value = '';
                if (currentData[column.code].value) {
                    switch (column.type) {
                        // 配列+オブジェクト形式
                        case 'USER_SELECT':
                        case 'ORGANIZATION_SELECT':
                        case 'GROUP_SELECT':
                            let aryName = [];
                            for (let i = 0; i < currentData[column.code].value.length; i++) {
                                aryName.push(currentData[column.code].value[i].name);
                            }
                            value = aryName.join(',');
                            break;
                        // 配列形式
                        case 'CHECK_BOX':
                        case 'MULTI_SELECT':
                            const array = currentData[column.code].value;
                            value = array.join(',');
                            break;
                        // オブジェクト形式
                        case 'CREATOR':
                        case 'MODIFIER':
                            value = currentData[column.code].value.name;
                            break;
                        // 日時
                        case 'DATETIME':
                        case 'CREATED_TIME':
                        case 'UPDATED_TIME':
                            // UCT⇒JST
                            convertJST(res[j][code].value);
                            break;
                        // 添付ファイル
                        // テーブル
                        case 'FILE':
                        case 'SUBTABLE':
                            // 対象外
                            break
                        default:
                            value = currentData[column.code].value;
                            break;
                    }
                }

                strBody += '<td class="td align ' + column.code + '">' + value + '</td>';
            }
            strBody += '</tr>';
        }
        strBody += ' </tbody>';

        if (data.length !== 0) {
            // 選択ボタン押下時イベント設定
            $(document).on('click', '.' + dialogId + ' .select_result_record_btn', function () {
                let record = kintone.mobile.app.record.get();
                let setVal = $(this).data('select');
                // セット対象フィールドへ値をセットし、自動ルックアップをON
                record.record[targetField].value = setVal;
                record.record[targetField].lookup = true;
                kintone.mobile.app.record.set(record);
                // ダイアログを閉じる
                closeModal();
            });
        }

        $('.result_table').append(strBody);
    }

    /**
     * モーダル内の検索エリア要素取得（モーダル表示時のみ取得可）
     * @param {*} dialogId
     * @returns
     */
    function getDialogSearchContent(dialogId) {
        // モーダルを生成するためにkintoneヘッダーへモーダル内容を生成するが
        // モーダルを開く際に、生成した内容を複製してモーダルに生成してしまう。
        // ダイアログ内の要素を取得するため、2番目の要素を明示的に取得して以降は利用する。
        let searchContent = $('.' + dialogId);
        let dlgSearchContent = null;
        if (searchContent.length > 1) {
            dlgSearchContent = searchContent[1];
        }
        return dlgSearchContent;
    }

    /**
     * 取得件数・検索結果エリアを空にする
     */
    function emptyDialogContentAndResultArea(dialogId) {
        // 取得件数エリアを空にする
        $('.' + dialogId + ' .count_area').empty();
        // 検索結果テーブルを空にする
        $('.' + dialogId + ' .result_table').empty();
    }

    /**
     * 連想配列が空かどうかのチェック
     * @param {*} obj
     * @returns
     */
    function isEmpty(obj) {
        return !Object.keys(obj).length;
    }

    /**
     * UCT表記からJST表記へ変換
     * @param {*} strDate
     * @returns
     */
    function convertJST(strDate) {
        if (!strDate) {
            return '';
        }
        let time = new Date(strDate);
        let convertTime = time.toLocaleString().slice(0, -3);

        return convertTime.replace(/\u002f/g, '-');
    }

})(jQuery, window.ssdConfig, window.snc);
