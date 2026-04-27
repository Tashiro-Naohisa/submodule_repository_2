/**
 * @fileoverview 複数ルックアップ検索ダイアログ
 * 【バージョンアップ】
 *  1.0.1 複数ダイアログ設定追加
 *  1.0.2 サブテーブルへのデータセット時の処理を修正
 *  1.0.3 検索結果のフィールドタイプによる値設定処理追加
 *  1.0.4 検索条件に日付フィールドを追加
 *  1.0.5 and/or条件切り替え機能追加
 *  1.0.6 初期条件設定機能追加
 *  1.0.7 修正対応：日付機能チェック
 *  1.0.8 不具合修正
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
 * @version 1.0.8
 * @customer XXXXX（2023-05-25）
 *
*/
jQuery.noConflict();
(function ($, msdConfig, sncLib) {
    'use strict';

    const dialogConfAry = msdConfig.dialogs;
    const MSD_CONTENT_ID = 'multiple_search_dialog_content_';
    const MSD_FOOTER_ID = 'multiple_search_dialogModal_footer_';
    const messagesConfig = msdConfig.messages;

    // 検索条件保持用オブジェクト
    let search_param = {};
    // 選択行レコードのキー値セット用配列
    let selected_list_key_of_record = [];

    /**
     * 新規登録レコード表示後イベント
     * 編集レコード表示後イベント
     */
    kintone.events.on([
        'app.record.create.show',
        'app.record.edit.show',
    ], function (event) {
        const record = event.record;

        // コンフィグで設定分のダイアログを作成
        for (let i = 0; i < dialogConfAry.length; i++) {
            const dialogConf = dialogConfAry[i];
            const dialogId = MSD_CONTENT_ID + dialogConf.id;
            const seachBtnConf = dialogConf.btnConfig.searchBtn;

            // 検索ボタン生成
            const btnSpace = kintone.app.record.getSpaceElement(seachBtnConf.spaceId);
            let searchBtn = document.createElement('button');
            searchBtn.id = seachBtnConf.id;
            searchBtn.className = 'button-custom';
            searchBtn.innerText = seachBtnConf.label;
            btnSpace.append(searchBtn);

            // 検索ダイアログを生成
            createDialog(dialogConf, seachBtnConf);

            // 検索ボタンクリック時のイベントを設定
            searchBtn.onclick = async function () {
                // エリア空にする
                emptyDialogContentAndResultArea(dialogId);
                //選択後リストを現在のレコードにセットされている状態に更新する
                refreshSelectedListForTargetSubtable(dialogConf);
                // ダイアログ表示
                showDialog(dialogId);

                // 検索項目の初期値設定
                setSearchItemDefaultValue(dialogId, dialogConf);

                // ダイアログ表示時に検索を行うかどうか
                if (dialogConf.dialog.searchOpenDialog) {
                    // 検索と結果表示
                    searchAndShowResult(dialogConf);
                } else {
                    // サブテーブルに選択されている行を作成
                    if (selected_list_key_of_record.length > 0) {
                        try {
                            // 選択後リストに選択されているレコード情報の取得
                            const resp = await getRecordOfSelectedList(dialogConf);
                            if (!resp) {
                                return false;
                            }

                            if (resp.length > 0) {
                                // 選択行レコードを作成
                                ctreateSelectedTableTrFromRecordData(resp, dialogConf);
                            }
                        } catch (err) {
                            console.log(err);
                            emptyDialogContentAndResultArea(dialogId);
                            Swal.fire({
                                title: 'Error',
                                html: messagesConfig.failGetRecord + '<br>' + err.message,
                                icon: 'error'
                            });
                            return false;
                        }
                    }
                }
            };

            // ダイアログ内検索ボタンの押下時イベント
            $(document).off('click', '.' + dialogId + ' .search_btn_dialog');
            $(document).on('click', '.' + dialogId + ' .search_btn_dialog', function () {
                // 検索と結果表示
                searchAndShowResult(dialogConf);
            });

            // 選択ボタン押下時イベント設定
            // 検索結果選択後テーブルへ追加し、
            // 検索結果テーブルから選択行を削除
            $(document).off('click', '.' + dialogId + ' .select_result_record_btn');
            $(document).on('click', '.' + dialogId + ' .select_result_record_btn', function () {
                let value = $(this).data('select');
                // 選択行リストへキー値をセット
                selected_list_key_of_record.push('' + value);
                // 選択後行を追加
                ctreateSelectedTableTr($(this).parents('tr'));
                // 選択行を削除
                $(this).parents('tr').remove();
            });

            // 取消ボタン押下時イベント設定
            // 検索結果選択後テーブルから選択行を削除
            $(document).off('click', '.' + dialogId + ' .selected_remove_record_btn');
            $(document).on('click', '.' + dialogId + ' .selected_remove_record_btn', function () {
                let value = $(this).data('select');
                // 選択行リストから取消ボタンで選択されたキー値を削除
                selected_list_key_of_record.splice(selected_list_key_of_record.indexOf('' + value), 1);
                // 選択行を削除
                $(this).parents('tr').remove();
            });

            // ダイアログ登録ボタン押下時イベント設定
            // 指定ターゲットサブテーブルフィールドへ選択後リストに登録されているキー値を設定
            const footerId = MSD_FOOTER_ID + dialogConf.id;
            $(document).off('click', '.' + footerId + ' .multiple_ok_btn');
            $(document).on('click', '.' + footerId + ' .multiple_ok_btn', function () {
                let record = kintone.app.record.get();
                // サブテーブルの1行目を取得（必ず1行存在するのでインデックス０で取得）
                let sutableValueTemp = record.record[dialogConf.targetSubtableField].value[0].value;
                // データセットテンプレート用にvalueをundefinedにする
                for (const key in sutableValueTemp) {
                    if (Object.hasOwnProperty.call(sutableValueTemp, key)) {
                        switch (sutableValueTemp[key].type) {
                            case 'USER_SELECT':
                            case 'CHECK_BOX':
                            case 'MULTI_SELECT':
                            case 'ORGANIZATION_SELECT':
                            case 'GROUP_SELECT':
                                sutableValueTemp[key].value = [];
                                break;
                            default:
                                sutableValueTemp[key].value = null;
                                break;
                        }

                    }
                }

                // サブテーブルvalueセット用配列
                let targetSubtableValue = [];
                // サブテーブルへデータ作成しセットを行う
                for (let i = 0; i < selected_list_key_of_record.length; i++) {
                    let sutableValue = $.extend(true, {}, sutableValueTemp);
                    // セット対象フィールドへ値をセットし、自動ルックアップをON
                    sutableValue[dialogConf.targetField].value = selected_list_key_of_record[i];
                    sutableValue[dialogConf.targetField].lookup = true;

                    targetSubtableValue.push({
                        'value': sutableValue
                    });
                }
                record.record[dialogConf.targetSubtableField].value = targetSubtableValue;
                kintone.app.record.set(record);
                // ダイアログを閉じる
                closeModal();
            });
        }

        return event;
    });

    /**
     * 対象アプリから検索条件に応じた検索を行い検索結果を表示する
     */
    async function searchAndShowResult(dialogConf) {
        const dialogId = MSD_CONTENT_ID + dialogConf.id;
        const searchCondErrors = [];

        // ダイアログコンテンツ、検索結果エリアを空にする
        emptyDialogContentAndResultArea(dialogId);

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

        try {
            // 検索件数を取得
            const totalCount = await getRecordTotalCount(dialogConf);

            // 取得件数セット
            let count = '<span>全 ' + totalCount + ' 件</span>';
            $('.' + dialogId + ' .count_area').append(count);

            // 検索結果の件数が設定値以上の場合
            if (totalCount > 0 && totalCount > dialogConf.dialog.maxResults) {
                Swal.fire({
                    title: 'warning'
                    , html: '検索結果が' + dialogConf.dialog.maxResults + '件を超えています。<br> 検索条件を入力して再度検索して下さい。'
                    , icon: 'warning'
                });
                return false;
            }

            // 検索対象レコードの取得
            const searchResults = await getSearchResultData(dialogConf);

            if (searchResults.length > 0) {
                // 検索結果テーブルの作成
                createResultTable(searchResults, dialogConf);
            } else {
                // 取得件数が0件の場合、「はい」を押すまでダイアログ表示
                await Swal.fire({
                    title: 'Info'
                    , html: messagesConfig.noResult
                    , icon: 'info'
                });
            }

            // 選択後リストに選択されているレコード情報の取得と表示
            if (selected_list_key_of_record.length > 0) {
                const selectedRecords = await getRecordOfSelectedList(dialogConf);
                if (selectedRecords && selectedRecords.length > 0) {
                    ctreateSelectedTableTrFromRecordData(selectedRecords, dialogConf);
                }
            }

            // 検索中ダイアログを閉じて終了
            Swal.close();

        } catch (err) {
            console.log(err);
            emptyDialogContentAndResultArea(dialogId);
            Swal.fire({
                title: 'Error'
                , html: messagesConfig.failGetRecord + '<br>' + err.message
                , icon: 'error'
            });
            return false;
        }


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
            $.each(dialogConf.dialog.searchFieldConfig, function (index, value) {
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
     * @returns
     */
    function getRecordTotalCount(dialogConf) {
        let query = '';
        if (!isEmpty(search_param)) {
            query = createSearchConditionQuery(dialogConf);
        }
        // configの初期条件を先頭に追加
        if (dialogConf.dialog.initQuery) {
            if (query) {
                query = dialogConf.dialog.initQuery + ' and ' + query;
            } else {
                query = dialogConf.dialog.initQuery;
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
        if (dialogConf.dialog.initQuery && query) {
            query = dialogConf.dialog.initQuery + ' and ' + query;
        } else if (dialogConf.dialog.initQuery && !query) {
            query = dialogConf.dialog.initQuery;
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
            $.each(dialogConf.dialog.searchFieldConfig, function (index, val) {
                // 設定が存在しない場合は処理をスキップ
                if (!val.init) {
                    return;
                }

                let searchField = $(dlgSearchContent).find('[name="' + index + '"]');
                switch (val.type) {
                    case 'text':    // テキストフィールド
                        let record = kintone.app.record.get();
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
     * 検索結果選択後に指定されているレコード情報の取得
     * @returns
     */
    function getRecordOfSelectedList(dialogConf) {
        let query = '';

        for (let i = 0; i < selected_list_key_of_record.length; i++) {
            const keyVal = selected_list_key_of_record[i];
            if (i === 0) {
                query = dialogConf.sourceField + ' = "' + keyVal + '"';
            } else {
                query += ' or ' + dialogConf.sourceField + ' = "' + keyVal + '"';
            }
        }

        // console.log(query);
        return sncLib.kintone.rest.getAllRecordsOnRecordId(dialogConf.app, query);
    }

    /**
     * 検索条件に応じたクエリを生成
     * @returns
     */
    function createSearchConditionQuery(configDialog) {
        const searchConfig = configDialog.dialog.searchFieldConfig;
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
        const configDialog = dialogConf.dialog;
        const dialogId = MSD_CONTENT_ID + dialogConf.id;
        // ダイアログのコンテンツ部分を作成
        let myDialogSpace = kintone.app.record.getSpaceElement(configDialog.spaceId);
        // ダイアログのand条件/or条件初期値
        const defaultCondition = dialogConf.dialog.defaultCondition;
        $(myDialogSpace).append(createDialogContent(dialogConf, defaultCondition));
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
                            $(document).on('click', '.multiple_search_dialogModal_content .search_table div[name="' + index + '"]', function () {
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
    function createDialogContent(dialogConf, defaultCondition) {
        const dialogId = MSD_CONTENT_ID + dialogConf.id;
        const configDialog = dialogConf.dialog;
        let radio_and = 'checked';
        let radio_or = '';
        if (defaultCondition !== 'and') {
            radio_and = '';
            radio_or = 'checked';
        }
        let content = '<div id="' + dialogId + '" class="dialog_content" style="display:none;">'
            + '   <div class="dialogModal_header multiple_search_dialogModal_header">' + configDialog.title + '</div>'
            + '   <div class="dialogModal_content multiple_search_dialogModal_content ' + dialogId + '">'
            // 検索項目の生成用テーブル
            + '     <table id="search_table" class="search_table"></table>'
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
            + '       <button id="search_btn_dialog" class="kintoneplugin-button-normal search_btn_dialog" >検索</button>'
            + '     </div>'
            + '     <div class="count_area"></div>'
            + '     <div class="list_table_wrapper">'
            // 検索結果の生成用テーブル
            + '       <table id="result_table" class="result_table result_table_' + dialogConf.id + '">'
            + '       </table>'
            + '     </div>'
            + '     <div class="list_selected_table_wrapper">'
            // 検索結果選択後の生成用テーブル
            + '       <table id="result_selected_table" class="result_selected_table result_selected_table_' + dialogConf.id + '">';

        // 検索結果選択後のテーブルヘッダーの生成
        content += '    <thead>'
            + '           <tr align="left">'
            + '             <th></th>';
        for (let i = 0; i < configDialog.showTableColumn.length; i++) {
            const column = configDialog.showTableColumn[i];
            content += '  <th class="' + column.code + '">' + column.label + '</th>';
        }
        content += '      </tr>'
            + '         </thead>'
            // 検索結果選択後のテーブルボディの生成
            + '         <tbody class="list_tbody_selected">'
            + '         </tbody>'
            + '       </table>'
            + '     </div>'
            + '   </div>'
            + '   <div id="dialogModal_footer" class="dialogModal_footer multiple_search_dialogModal_footer multiple_search_dialogModal_footer_' + dialogConf.id + '">'
            + '   </div>'
            + '</div>';

        return content;
    };

    /**
     * ダイアログのフッター部分の生成
     * 別画面遷移オプションボタンなど
     */
    function createDialogFooter(dialogConf) {
        const optionBtns = dialogConf.dialog.optionBtn;
        let footer = '';
        for (let i = 0; i < optionBtns.length; i++) {
            const btnConf = optionBtns[i];
            footer += '<button id="' + btnConf.id + '" class="' + btnConf.id
                + ' kintoneplugin-button-normal" data-dialogmodal-but="touroku" type="button">' + btnConf.label + '</button>';

            // ボタン押下時のイベント設定
            $(document).on('click', '#' + btnConf.id, function () {
                let fieldRecord = kintone.app.record.get();
                let tab = window.open("/k/" + btnConf.appId + "/edit");
                // 画面遷移後の値設定

                tab.addEventListener("load", function () {
                    postMessage(tab.kintone !== null, location.origin);
                });

                window.addEventListener("message", (function (event) {
                    return function field_set() {
                        let record = tab.kintone.app.record.get();
                        // アプリ登録画面で初期値を設定する
                        if (btnConf.target && btnConf.source) {
                            record.record[btnConf.target].value = fieldRecord.record[btnConf.source].value;
                            record.record[btnConf.target].lookup = true;
                        }
                        // 戻り処理用のチェックボックスに値を設定
                        if (btnConf.checkField) {
                            if (record.record[btnConf.checkField]) {
                                record.record[btnConf.checkField].value = ['有'];
                            }
                        }

                        tab.kintone.app.record.set(record);
                        window.removeEventListener("message", field_set, false);
                    };
                })(), false);


                // ダイアログを閉じる
                closeModal();
            });
        }

        // 登録ボタン
        // モーダル用のOKボタンdata属性は使用しない
        footer += '<button class="btn btn-default kintoneplugin-button-normal multiple_ok_btn" data-dialogmodal-but="ok" type="button">登録</button>'
        // キャンセルボタン
        footer += '<button class="btn btn-default kintoneplugin-button-normal" data-dialogmodal-but="cancel" type="button">キャンセル</button>'
        return footer;
    }

    /**
     * 検索結果テーブル生成
     * @param {*} data
     */
    function createResultTable(data, dialogConf) {
        const dialogId = MSD_CONTENT_ID + dialogConf.id;
        const showTableColumns = dialogConf.dialog.showTableColumn;
        const sourceField = dialogConf.sourceField;

        // ヘッダーの生成
        let strHeader = '<thead>'
            + '            <tr align="left">'
            + '              <th></th>';
        for (let i = 0; i < showTableColumns.length; i++) {
            const column = showTableColumns[i];
            strHeader += '<th class="' + column.code + '">' + column.label + '</th>';
        }
        strHeader += '     </tr>';
        strHeader += '   </thead>';
        $('.' + dialogId + ' .result_table').append(strHeader);


        // ボディの生成
        let strBody = '<tbody id="list_tbody" >';
        for (let i = 0; i < data.length; i++) {
            let currentData = data[i];
            // 選択後リストにレコードキーが存在するかのチェック
            if (existKeyOfRecordInSelectedList(currentData[sourceField].value)) continue;
            // 1列目の選択行追加
            strBody += '<tr class="table_cont">'
                + '       <td class="td align select_btn">'
                + '         <input type="button" class="select_result_record_btn" value="選択" data-select="' + currentData[sourceField].value + '">'
                + '       </td>';
            // コンフィグで設定された検索結果を表示するフィールドを追加
            for (let y = 0; y < showTableColumns.length; y++) {
                const column = showTableColumns[y];
                // const value = (currentData[column.code].value) ? currentData[column.code].value : '';
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

        $('.' + dialogId + ' .result_table').append(strBody);
    }

    /**
     * 選択後リストを現在のサブテーブル状況で更新
     */
    function refreshSelectedListForTargetSubtable(dialogConf) {
        // 初期化
        selected_list_key_of_record = [];
        // 現在のレコード情報を取得
        let record = kintone.app.record.get();
        let sutableValues = record.record[dialogConf.targetSubtableField].value
        for (let i = 0; i < sutableValues.length; i++) {
            const sutableValue = sutableValues[i];
            // ターゲットフィールドに値が設定されている場合に値を選択後リストへセット
            if (sutableValue.value[dialogConf.targetField].value) {
                selected_list_key_of_record.push(sutableValue.value[dialogConf.targetField].value);
            }
        }
    }

    /**
     * 選択後リストにキー値が存在するかどうか
     * @param {*} key
     * @returns
     */
    function existKeyOfRecordInSelectedList(key) {
        if (selected_list_key_of_record.indexOf(key) > -1) {
            return true;
        }
        return false;
    }

    /**
     * 選択後行のTr要素を作成
     * @param {*} selectTrElm 検索結果テーブルの選択行
     */
    function ctreateSelectedTableTr(selectTrElm) {
        let elmTds = selectTrElm.children();
        let selectedTr = '<tr class="">';

        for (let i = 0; i < elmTds.length; i++) {
            const elmTd = elmTds[i];
            // 1列目は取消ボタン列
            if (i === 0) {
                selectedTr += '<td class="td_align remove_btn">'
                    + '          <input type="button" class="selected_remove_record_btn" data-select="' + $(elmTd).find('input').data('select') + '" value="取消">'
                    + '        </td>';
            } else {
                selectedTr += '<td class="' + elmTd.className + ' selected_td">' + elmTd.innerText + '</td>';
            }
        }
        selectedTr += '  </tr>'

        $(".list_tbody_selected").append(selectedTr);
    }

    /**
     * レコード情報から選択後行のTr要素を作成し選択後テーブルへセット
     * @param {*} record レコード情報　配列
     */
    function ctreateSelectedTableTrFromRecordData(record, dialogConf) {
        let selectedTr = '';
        const showTableColumns = dialogConf.dialog.showTableColumn;


        for (let i = 0; i < selected_list_key_of_record.length; i++) {
            const keyVal = selected_list_key_of_record[i];

            const selectedRecord = record.find(column => column[dialogConf.sourceField].value === keyVal);

            if (!selectedRecord) {
                continue;
            }

            selectedTr += '<tr class="">';
            // 1列目の取消列追加
            selectedTr += '  <td class="td_align remove_btn">'
                + '            <input type="button" class="selected_remove_record_btn" data-select="' + selectedRecord[dialogConf.sourceField].value + '" value="取消">'
                + '          </td>';

            // コンフィグで設定された検索結果を表示するフィールドを追加
            for (let y = 0; y < showTableColumns.length; y++) {
                const column = showTableColumns[y];
                const value = (selectedRecord[column.code].value) ? selectedRecord[column.code].value : '';
                selectedTr += '<td class="td align ' + column.code + '">' + value + '</td>';
            }
            selectedTr += '</tr>'
        }

        $(".list_tbody_selected").append(selectedTr);
    }

    /**
     * モーダル内の検索エリア要素取得（モーダル表示時のみ取得可）
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
        // 検索結果選択後テーブルを空にする
        $('.' + dialogId + ' .result_selected_table tbody').empty();
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

})(jQuery, window.msdConfig, window.snc);
