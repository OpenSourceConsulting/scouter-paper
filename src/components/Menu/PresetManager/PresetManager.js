import React, {Component} from 'react';
import './PresetManager.css';
import {setControlVisibility, pushMessage} from '../../../actions';
import {connect} from 'react-redux';
import {withRouter} from 'react-router-dom';
import 'url-search-params-polyfill';
import jQuery from "jquery";
import {errorHandler, setAuthHeader, getWithCredentials, getHttpProtocol, updateQueryStringParameter, getCurrentDefaultServer} from '../../../common/common';

class PresetManager extends Component {

    constructor(props) {
        super(props);
        this.state = {
            presets: [],
            selectedPresetNo : null,
            selectedEditNo : null,
            editText : null
        };
    }

    componentWillReceiveProps(nextProps) {
        if (!this.props.visible && nextProps.visible) {
            this.loadPresets(nextProps.config, nextProps.user);
        }
    }

    savePreset = (presets) => {
        let that = this;
        let data = {
            key : "__scouter_paper_preset",
            value : JSON.stringify(presets)
        };

        jQuery.ajax({
            method: "PUT",
            async: true,
            url: getHttpProtocol(this.props.config) + "/scouter/v1/kv",
            xhrFields: getWithCredentials(this.props.config),
            contentType : "application/json",
            data : JSON.stringify(data),
            beforeSend: function (xhr) {
                setAuthHeader(xhr, that.props.config, that.props.user);
            }
        }).done((msg) => {
            if (msg && Number(msg.status) === 200) {
                that.setState({
                    presets : presets
                });
            }
        }).fail((xhr, textStatus, errorThrown) => {
            errorHandler(xhr, textStatus, errorThrown, this.props);
        });
    };

    loadPresets = (config, user) => {

        jQuery.ajax({
            method: "GET",
            async: true,
            url: getHttpProtocol(config) + "/scouter/v1/kv/__scouter_paper_preset",
            xhrFields: getWithCredentials(config),
            beforeSend: function (xhr) {
                setAuthHeader(xhr, config, user);
            }
        }).done((msg) => {
            if (msg && Number(msg.status) === 200) {
                let list = JSON.parse(msg.result);
                if (list && list.length > 0) {
                    this.setState({
                        presets : list,
                        selectedPresetNo : null,
                        selectedEditNo : null
                    });
                }
            }
        }).fail((xhr, textStatus, errorThrown) => {
            errorHandler(xhr, textStatus, errorThrown, this.props);
        });
    };

    cancelClick = () => {
        this.props.togglePresetManagerVisible();
    };

    saveClick = () => {
        let presets = this.state.presets;
        if (!presets) {
            presets = [];
        }
        let instancesParam = new URLSearchParams(this.props.location.search).get('instances');

        presets.push({
            no : presets.length,
            name : "my-service-" + (presets.length + 1),
            creationTime : (new Date()).getTime(),
            instances : instancesParam
        });

        this.savePreset(presets);
    };

    deleteClick = () => {
        if (this.state.selectedPresetNo === null) {
            this.props.pushMessage("info", "NO PRESET SELECTED", "select preset to delete first");
            this.props.setControlVisibility("Message", true);
        } else {
            let presets = Object.assign(this.state.presets);
            for (let i=0; i<presets.length; i++) {
                let preset = presets[i];

                if (preset.no === this.state.selectedPresetNo) {
                    presets.splice(i, 1);
                    this.setState({
                        presets : presets,
                        selectedPresetNo : null,
                        selectedEditNo : null
                    });

                    this.savePreset(presets);
                    break;
                }
            }
        }
    };

    loadClick = () => {
        if (this.state.selectedPresetNo === null) {
            this.props.pushMessage("info", "NO PRESET SELECTED", "select preset to load first");
            this.props.setControlVisibility("Message", true);
        } else {
            for (let i=0; i<this.state.presets.length; i++) {
                let preset = this.state.presets[i];

                if (preset.no === this.state.selectedPresetNo) {
                    this.props.togglePresetManagerVisible();
                    
                    setTimeout(() => {
                        const server = getCurrentDefaultServer(this.props.config);
                        let newUrl = updateQueryStringParameter(window.location.href, "instances", preset.instances);
                        newUrl = updateQueryStringParameter(newUrl, "address", server.address);
                        newUrl = updateQueryStringParameter(newUrl, "port", server.port);
                        window.location.href = newUrl;
                        window.history.go(0);
                    }, 1);

                    break;
                }
            }
        }

    };

    presetClick = (no) => {
        this.setState({
            selectedPresetNo : no
        });
    };

    editClick = (no, name) => {
        this.setState({
            selectedEditNo : no,
            editText : name
        });
    };

    updateClick = (no) => {
        let presets = Object.assign(this.state.presets);
        for (let i=0; i<presets.length; i++) {
            let preset = presets[i];
            if (preset.no === no) {
                preset.name = this.state.editText;
                this.setState({
                    presets : presets,
                    selectedPresetNo : null,
                    selectedEditNo : null
                });
                break;
            }
        }
        this.savePreset(presets);
    };

    onTextChange = (event) => {
        this.setState({
            editText: event.target.value
        });
    };

    render() {

        return (
            <div className={"preset-manager-bg " + (this.props.visible ? "" : "hidden")}>
                <div className={"preset-manager-fixed-bg"}></div>
                <div className="preset-manager popup-div">
                    <div className="title">
                        <div>PRESETS</div>
                    </div>
                    <div className="content-ilst scrollbar">
                        <ul>
                            {this.state.presets.map((d, i) => {
                                return (<li key={i} className={d.no === this.state.selectedPresetNo ? 'selected' : ''} onClick={this.presetClick.bind(this, d.no)}>
                                    <div>
                                        <span className="no">{i+1}</span>
                                        {(d.no !== this.state.selectedEditNo) && <span className="name">{d.name}</span>}
                                        {(d.no === this.state.selectedEditNo) && <span className="name edit"><input type="text" value={this.state.editText} onChange={this.onTextChange.bind(this )} /></span>}
                                        {(d.no !== this.state.selectedEditNo) && <span className="edit-btn" onClick={this.editClick.bind(this, d.no, d.name)}>EDIT</span>}
                                        {(d.no === this.state.selectedEditNo) && <span className="done-btn" onClick={this.updateClick.bind(this, d.no)}>DONE</span>}
                                    </div>
                                </li>)
                            })}

                        </ul>
                    </div>
                    <div className="buttons">
                        <button className="delete-btn" onClick={this.deleteClick}>DELETE</button>
                        <button className="save-btn" onClick={this.saveClick}>SAVE CURRENT PRESET</button>
                        <button className="cancel-btn" onClick={this.cancelClick}>CANCEL</button>
                        <button className="load-btn" onClick={this.loadClick}>LOAD</button>
                    </div>
                </div>
            </div>
        );
    }
}

let mapStateToProps = (state) => {
    return {
        instances: state.target.instances,
        config: state.config,
        user: state.user
    };
};

let mapDispatchToProps = (dispatch) => {
    return {
        setControlVisibility: (name, value) => dispatch(setControlVisibility(name, value)),
        pushMessage: (category, title, content) => dispatch(pushMessage(category, title, content)),
    };
};

PresetManager = connect(mapStateToProps, mapDispatchToProps)(PresetManager);

export default withRouter(PresetManager);
