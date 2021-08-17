import React from 'react'
import styled from 'styled-components'
import ProgressBar from '../ProgressBar'
import { H4, Paragraph } from '../Typography'

const Wrapper = styled.div`
  position: absolute;
  top: 36px;
  left: 36px;
  display: flex;
  flex-direction: column;
  background-color: #10c57b;
  padding: 1.7rem;
  border-radius: 4px;
  z-index: 1;
`

const InfoBox = ({
  title = 'Lastbil',
  id,
  subTitle = 'Åkeri Jönsson',
  fleet = 'Kör för DHL',
}) => {
  return (
    <Wrapper left={20} top={50}>
      <H4>{`${title}  ${id}`}</H4>
      <Paragraph>{subTitle}</Paragraph>
      <Paragraph>{fleet}</Paragraph>
      <div>
        <Paragraph thin>Fyllnadsgrad:</Paragraph>
        <ProgressBar completed={60} />
      </div>
    </Wrapper>
  )
}

export default InfoBox