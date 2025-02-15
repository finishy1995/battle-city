import { List } from 'immutable'
import React from 'react'
import { connect } from 'react-redux'
import { match, Redirect } from 'react-router-dom'
import { push, replace } from 'react-router-redux'
import { Dispatch } from 'redux'
import { StageConfig, State } from '../types'
import { BLOCK_SIZE as B, PLAYER_CONFIGS } from '../utils/constants'
import Screen from './Screen'
import StagePreview from './StagePreview'
import Text from './Text'
import TextButton from './TextButton'
import {getUserId, login, queryMatchmaking, startMatchmaking} from "../utils/server";
import {setInterval} from "timers";

class ChooseStageScene extends React.PureComponent<{
  stages: List<StageConfig>
  dispatch: Dispatch
  location: Location
  match: match<{ stageName: string }>
}> {
  state = {
    words: "login ...",
  }

  componentDidMount() {
    document.addEventListener('keydown', this.onKeyDown)
    document.addEventListener('matchmaking_start', this.onMatchmakingStart)
    document.addEventListener('matchmaking_result', this.onMatchmakingResult)
    login().then(
      (res) => {
        console.log(res);
        if (res.code < 100) {
          this.setState({words: "login success. welcome " + getUserId()});
        } else {
          this.setState({words: "login fail. errorcode: "+res.code});
        }
      }
    ).catch(
      (err) => {
        console.log(err);
        this.setState({words: "login fail. please see console for more details"});
      }
    )
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.onKeyDown)
  }

  onMatchmakingStart = (event: any) => {
    if (event.detail.code > 99) {
      this.setState({words: "matchmaking fail. errorcode: "+event.detail.code});
    } else {
      this.setState({words: "matchmaking start ..."});

      queryMatchmaking();
    }
  }

  onMatchmakingResult = (event: any) => {
    if (event.detail.code > 99 || event.detail.result == 1 || event.detail.result == 2) {
      setTimeout(queryMatchmaking, 2000);
    } else if (event.detail.result == 3) {
      this.setState({words: "matchmaking success. endpoint: " + event.detail.detail.endpoint + ". secret: " + event.detail.detail.secret});
    } else {
      this.setState({words: "matchmaking failed. please try again."});
    }
  }

  onKeyDown = (event: KeyboardEvent) => {
    const config = PLAYER_CONFIGS.player1
    if (event.code === config.control.left) {
      this.onChoosePrevStage()
    } else if (event.code === config.control.right) {
      this.onChooseNextStage()
    } else if (event.code === config.control.fire) {
      this.onStartPlay()
    }
  }

  getCurrentStageIndex = () => {
    const { stages, match } = this.props
    const { stageName } = match.params
    const stageIndex = stages.findIndex(s => s.name === stageName)
    DEV.ASSERT && console.assert(stageIndex !== -1)
    return stageIndex
  }

  onChoose = (stageName: string) => {
    const { dispatch, location } = this.props
    dispatch(replace(`/choose/${stageName}${location.search}`))
  }

  onChoosePrevStage = () => {
    const { stages } = this.props
    const stageIndex = this.getCurrentStageIndex()
    if (stageIndex > 0) {
      this.onChoose(stages.get(stageIndex - 1).name)
    }
  }

  onChooseNextStage = () => {
    const { stages } = this.props
    const stageIndex = this.getCurrentStageIndex()
    if (stageIndex < stages.size - 1) {
      this.onChoose(stages.get(stageIndex + 1).name)
    }
  }

  onStartPlay = () => {
    const { dispatch, match, location } = this.props
    const { stageName } = match.params
    console.log(stageName);
    let stageNum = parseInt(stageName);
    startMatchmaking(stageNum);
    // dispatch(push(`/stage/${stageName}${location.search}`))
  }

  render() {
    const { match, dispatch, stages } = this.props
    const stageNames = stages.map(s => s.name)
    const { stageName } = match.params
    if (!stageNames.includes(stageName)) {
      return <Redirect to={`${match.url}/${stageNames.first()}`} />
    }
    const index = stageNames.indexOf(stageName)
    return (
      <Screen background="#333">
        <Text content="choose stage:" x={0.5 * B} y={0.5 * B} />
        <StagePreview
          key={index - 1}
          stage={index === 0 ? null : stages.get(index - 1)}
          x={0.75 * B}
          y={4.375 * B}
          scale={1 / 4}
        />
        <StagePreview
          key={index}
          stage={stages.get(index)}
          x={4.75 * B}
          y={2.75 * B}
          scale={1 / 2}
        />
        <StagePreview
          key={index + 1}
          stage={stages.get(index + 1)}
          x={12 * B}
          y={4.375 * B}
          scale={1 / 4}
        />
        <Text content={`stage ${stageName}`} x={6.5 * B} y={9.75 * B} />
        <g className="button-areas" transform={`translate(${2.5 * B}, ${12 * B})`}>
          <TextButton
            content="prev"
            disabled={index === 0}
            x={0}
            y={0}
            onClick={this.onChoosePrevStage}
          />
          <TextButton
            content="next"
            disabled={index === stageNames.size - 1}
            x={3 * B}
            y={0}
            onClick={this.onChooseNextStage}
          />
          <TextButton content="play" stroke="#96d332" x={6 * B} y={0} onClick={this.onStartPlay} />
          <TextButton content="back" x={9 * B} y={0} onClick={() => dispatch(replace('/'))} />
        </g>
        <g className="hint" transform={`translate(${0.5 * B},${14.5 * B}) scale(0.5)`}>
          <Text fill="#999" content={this.state.words} />
        </g>
      </Screen>
    )
  }
}

const mapStateToProps = (state: State) => ({ stages: state.stages })

export default connect(mapStateToProps)(ChooseStageScene)
